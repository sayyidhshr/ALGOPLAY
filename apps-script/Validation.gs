/**
 * ALGOPLAY Quiz Backend — Validasi sisi server.
 *
 * Semua fungsi di sini murni (tidak menyentuh FormApp) sehingga dapat diuji
 * dengan model buatan di Tests.gs. Input dari browser dianggap tidak tepercaya.
 */

const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

/**
 * @param {*} value
 * @return {boolean}
 */
function isValidSubmissionId(value) {
  return typeof value === 'string' && SUBMISSION_ID_PATTERN.test(value);
}

/**
 * Memvalidasi jawaban terhadap model kuis.
 * @param {{byId: Object<string, Object>}} model
 * @param {*} answers objek { [questionId]: string | string[] }
 * @return {{details: Object[], normalized: Object<string, string|string[]>}}
 *   details kosong berarti valid. normalized berisi jawaban yang sudah dirapikan
 *   (trim, dedupe) dan hanya untuk pertanyaan yang benar-benar dijawab.
 */
function validateSubmission(model, answers) {
  const details = [];
  const normalized = {};

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return {
      details: [{ questionId: null, code: 'INVALID_TYPE', message: 'Jawaban harus berupa objek.' }],
      normalized: normalized,
    };
  }

  const byId = model.byId;

  // 1) Periksa setiap jawaban yang dikirim.
  Object.keys(answers).forEach(function (qid) {
    const meta = byId[qid];
    if (!meta || meta.type === 'SECTION_HEADER') {
      details.push({
        questionId: qid,
        code: 'INVALID_QUESTION_ID',
        message: 'Pertanyaan tidak ditemukan pada formulir ini.',
      });
      return;
    }

    const raw = answers[qid];

    if (meta.type === 'CHECKBOX') {
      if (!Array.isArray(raw)) {
        details.push({ questionId: qid, code: 'INVALID_TYPE', message: 'Jawaban pilihan jamak harus berupa daftar.' });
        return;
      }
      const seen = {};
      const cleaned = [];
      for (let i = 0; i < raw.length; i++) {
        if (typeof raw[i] !== 'string') {
          details.push({ questionId: qid, code: 'INVALID_TYPE', message: 'Setiap pilihan harus berupa teks.' });
          return;
        }
        const v = raw[i].trim();
        if (!v || seen[v]) continue;
        seen[v] = true;
        cleaned.push(v);
      }
      for (let j = 0; j < cleaned.length; j++) {
        const err = checkChoiceValue(meta, cleaned[j]);
        if (err) {
          details.push({ questionId: qid, code: err.code, message: err.message });
          return;
        }
      }
      if (cleaned.length > 0) normalized[qid] = cleaned;
      return;
    }

    if (typeof raw !== 'string') {
      details.push({ questionId: qid, code: 'INVALID_TYPE', message: 'Jawaban harus berupa teks.' });
      return;
    }
    const value = raw.trim();
    if (!value) return; // kosong → diperlakukan belum dijawab (dicek di langkah 2)

    if (meta.type === 'MULTIPLE_CHOICE' || meta.type === 'LIST') {
      const err = checkChoiceValue(meta, value);
      if (err) {
        details.push({ questionId: qid, code: err.code, message: err.message });
        return;
      }
      normalized[qid] = value;
      return;
    }

    // TEXT / PARAGRAPH_TEXT
    const max = meta.maxLength || LIMITS.TEXT_MAX;
    if (value.length > max) {
      details.push({
        questionId: qid,
        code: 'TEXT_TOO_LONG',
        message: 'Jawaban melebihi batas ' + max + ' karakter.',
      });
      return;
    }
    normalized[qid] = value;
  });

  // 2) Periksa SEMUA pertanyaan wajib, bukan hanya yang dikirim.
  Object.keys(byId).forEach(function (qid) {
    const meta = byId[qid];
    if (meta.type === 'SECTION_HEADER' || !meta.required) return;
    const alreadyFlagged = details.some(function (d) {
      return d.questionId === qid;
    });
    if (alreadyFlagged) return;
    if (!Object.prototype.hasOwnProperty.call(normalized, qid)) {
      details.push({ questionId: qid, code: 'REQUIRED_MISSING', message: 'Pertanyaan ini wajib dijawab.' });
    }
  });

  return { details: details, normalized: normalized };
}

/**
 * Memeriksa satu nilai pilihan terhadap daftar pilihan sah.
 * @return {{code: string, message: string}|null}
 */
function checkChoiceValue(meta, value) {
  if (meta.choices.indexOf(value) !== -1) return null;
  // "Lainnya" hanya untuk MULTIPLE_CHOICE/CHECKBOX dengan opsi lain aktif.
  if (meta.hasOtherOption && meta.type !== 'LIST') {
    if (value.length > LIMITS.TEXT_MAX) {
      return { code: 'TEXT_TOO_LONG', message: 'Jawaban "Lainnya" terlalu panjang.' };
    }
    return null;
  }
  return { code: 'INVALID_CHOICE', message: 'Pilihan tidak tersedia pada pertanyaan ini.' };
}
