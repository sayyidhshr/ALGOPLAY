/**
 * ALGOPLAY Quiz Backend — Pengiriman respons ke Google Forms.
 *
 * Urutan: validasi payload → buka formulir → cek menerima respons → bangun model
 * → validasi jawaban → cek idempotency → lock → buat & submit respons → hitung skor
 * → simpan hasil ke cache (idempotency) → kembalikan hasil.
 *
 * Tidak ada respons yang dibuat jika validasi gagal. Cache hanya diisi SETELAH
 * submit() berhasil, sehingga kegagalan tidak pernah dianggap "sudah terkirim".
 */

/**
 * @param {Object} payload { action, quiz, clientSubmissionId, answers }
 * @return {Object} data sesuai kontrak
 */
function submitQuiz(payload) {
  const quizKey = String(payload.quiz || '');
  const clientSubmissionId = payload.clientSubmissionId;

  if (!isValidSubmissionId(clientSubmissionId)) {
    throw apiError('INVALID_PAYLOAD', 'clientSubmissionId tidak valid.');
  }
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
    throw apiError('INVALID_PAYLOAD', 'Field answers harus berupa objek.');
  }

  const form = openQuizForm(quizKey);

  if (!form.isAcceptingResponses()) {
    throw apiError('FORM_NOT_ACCEPTING', 'Formulir ' + QUIZ_CONFIG[quizKey].label + ' saat ini tidak menerima respons.');
  }

  const model = buildQuizModel(form, quizKey);
  const validation = validateSubmission(model, payload.answers);
  if (validation.details.length > 0) {
    throw apiError('VALIDATION_ERROR', 'Beberapa jawaban belum valid. Periksa kembali.', validation.details);
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'sub:' + quizKey + ':' + clientSubmissionId;

  const cachedBefore = cache.get(cacheKey);
  if (cachedBefore) return markDuplicate(cachedBefore);

  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    locked = lock.tryLock(LIMITS.LOCK_WAIT_MS);
  } catch (err) {
    locked = false;
  }
  if (!locked) {
    throw apiError('BUSY', 'Server sedang sibuk. Tunggu beberapa detik lalu coba kirim lagi.');
  }

  try {
    const cachedInside = cache.get(cacheKey);
    if (cachedInside) return markDuplicate(cachedInside);

    const formResponse = form.createResponse();
    const answers = validation.normalized;

    Object.keys(answers).forEach(function (qid) {
      const meta = model.byId[qid];
      formResponse.withItemResponse(meta.item.createResponse(answers[qid]));
    });

    let submitted;
    try {
      submitted = formResponse.submit();
    } catch (err) {
      console.error('submit() gagal untuk ' + quizKey + ': ' + err);
      throw apiError('SUBMIT_FAILED', 'Jawaban gagal dikirim ke Google Forms. Jangan kirim ulang berulang kali; hubungi pendamping jika masalah berlanjut.');
    }

    const result = computeResult(model, answers);

    const data = {
      submitted: true,
      duplicate: false,
      quiz: quizKey,
      responseId: submitted.getId(),
      submittedAt: submitted.getTimestamp().toISOString(),
      result: result,
    };

    try {
      cache.put(cacheKey, JSON.stringify(data), LIMITS.DEDUP_TTL_SECONDS);
    } catch (err) {
      // Kegagalan cache tidak boleh membatalkan respons yang sudah tersimpan.
      console.warn('cache.put gagal: ' + err);
    }

    return data;
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {
      /* abaikan */
    }
  }
}

/**
 * @param {string} cachedJson
 * @return {Object}
 */
function markDuplicate(cachedJson) {
  const data = JSON.parse(cachedJson);
  data.duplicate = true;
  return data;
}
