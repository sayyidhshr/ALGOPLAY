/**
 * ALGOPLAY Quiz Backend — Pengujian manual dari editor Apps Script.
 *
 * Jalankan fungsi test_* dari menu Run. Fungsi yang berawalan "test_pure_"
 * tidak menyentuh Google Forms dan aman dijalankan kapan saja. Fungsi lain
 * membaca formulir sungguhan (tidak mengirim respons).
 */

function assert(condition, message) {
  if (!condition) throw new Error('ASSERT GAGAL: ' + message);
}

/** Model buatan untuk pengujian fungsi murni. */
function makeFakeModel() {
  const byId = {
    h1: { type: 'SECTION_HEADER', required: false, choices: [], correct: [], points: 0, autoGraded: false, maxLength: null, hasOtherOption: false },
    q1: { type: 'MULTIPLE_CHOICE', required: true, choices: ['A', 'B', 'C'], correct: ['B'], points: 10, autoGraded: true, maxLength: null, hasOtherOption: false },
    q2: { type: 'CHECKBOX', required: true, choices: ['X', 'Y', 'Z'], correct: ['X', 'Z'], points: 10, autoGraded: true, maxLength: null, hasOtherOption: false },
    q3: { type: 'LIST', required: false, choices: ['1', '2'], correct: ['2'], points: 5, autoGraded: true, maxLength: null, hasOtherOption: false },
    q4: { type: 'TEXT', required: true, choices: [], correct: [], points: 5, autoGraded: false, maxLength: 2000, hasOtherOption: false },
    q5: { type: 'PARAGRAPH_TEXT', required: false, choices: [], correct: [], points: 0, autoGraded: false, maxLength: 5000, hasOtherOption: false },
  };
  const scoring = { available: true, autoGradedCount: 3, manualReviewCount: 1, maxScore: 25, reason: null };
  return { byId: byId, scoring: scoring, isQuiz: true };
}

function test_pure_validate_missingRequired() {
  const model = makeFakeModel();
  const out = validateSubmission(model, { q1: 'B' });
  const codes = out.details.map(function (d) { return d.code + ':' + d.questionId; });
  assert(codes.indexOf('REQUIRED_MISSING:q2') !== -1, 'q2 wajib harus terdeteksi');
  assert(codes.indexOf('REQUIRED_MISSING:q4') !== -1, 'q4 wajib harus terdeteksi');
  assert(codes.indexOf('REQUIRED_MISSING:q1') === -1, 'q1 sudah dijawab');
  console.log('OK test_pure_validate_missingRequired', codes);
}

function test_pure_validate_invalidChoiceAndId() {
  const model = makeFakeModel();
  const out = validateSubmission(model, { q1: 'D', q2: ['X', 'Q'], q4: 'ok', zzz: 'x', h1: 'x' });
  const codes = out.details.map(function (d) { return d.code + ':' + d.questionId; });
  assert(codes.indexOf('INVALID_CHOICE:q1') !== -1, 'q1 pilihan D tidak sah');
  assert(codes.indexOf('INVALID_CHOICE:q2') !== -1, 'q2 pilihan Q tidak sah');
  assert(codes.indexOf('INVALID_QUESTION_ID:zzz') !== -1, 'id asing harus ditolak');
  assert(codes.indexOf('INVALID_QUESTION_ID:h1') !== -1, 'section header tidak boleh dijawab');
  console.log('OK test_pure_validate_invalidChoiceAndId', codes);
}

function test_pure_validate_textTooLong() {
  const model = makeFakeModel();
  const long = new Array(2002).join('a');
  const out = validateSubmission(model, { q1: 'B', q2: ['X'], q4: long });
  assert(out.details.some(function (d) { return d.code === 'TEXT_TOO_LONG' && d.questionId === 'q4'; }), 'teks panjang harus ditolak');
  console.log('OK test_pure_validate_textTooLong');
}

function test_pure_scoring_checkboxAllOrNothing() {
  const model = makeFakeModel();
  const full = computeResult(model, { q1: 'B', q2: ['Z', 'X'], q3: '2', q4: 'teks' });
  assert(full.score === 25, 'skor penuh harus 25, dapat ' + full.score);
  assert(full.percentage === 100, 'persentase 100');
  assert(full.correctCount === 3, 'tiga soal benar');

  const partial = computeResult(model, { q1: 'B', q2: ['X'], q4: 'teks' });
  assert(partial.score === 10, 'checkbox parsial = 0 poin, total 10, dapat ' + partial.score);

  const extra = computeResult(model, { q1: 'A', q2: ['X', 'Y', 'Z'], q4: 'teks' });
  assert(extra.score === 0, 'checkbox berlebih = 0 poin');
  assert(extra.totalQuestions === 5, 'total pertanyaan tanpa header = 5');
  console.log('OK test_pure_scoring_checkboxAllOrNothing');
}

function test_pure_scoring_unavailable() {
  const model = makeFakeModel();
  model.scoring = { available: false, autoGradedCount: 0, manualReviewCount: 1, maxScore: 0, reason: 'Kunci belum diatur' };
  const r = computeResult(model, { q1: 'B' });
  assert(r.available === false && r.score === null && r.reason === 'Kunci belum diatur', 'hasil tidak tersedia');
  console.log('OK test_pure_scoring_unavailable');
}

function test_pure_submissionId() {
  assert(isValidSubmissionId('3f1c2a9b-1111-4222-8333-444455556666'), 'uuid valid');
  assert(!isValidSubmissionId('short'), 'terlalu pendek');
  assert(!isValidSubmissionId('bad id with spaces!'), 'karakter tidak sah');
  console.log('OK test_pure_submissionId');
}

function test_pure_all() {
  test_pure_validate_missingRequired();
  test_pure_validate_invalidChoiceAndId();
  test_pure_validate_textTooLong();
  test_pure_scoring_checkboxAllOrNothing();
  test_pure_scoring_unavailable();
  test_pure_submissionId();
  console.log('SEMUA TES MURNI LULUS');
}

/* --- Tes yang membaca formulir sungguhan (tanpa mengirim respons) --- */

function test_ping() {
  const res = doGet({ parameter: { action: 'ping' } });
  console.log(res.getContent());
}

function test_getQuiz_pretest() {
  const res = doGet({ parameter: { action: 'getQuiz', quiz: 'pretest' } });
  console.log(res.getContent());
}

function test_getQuiz_posttest() {
  const res = doGet({ parameter: { action: 'getQuiz', quiz: 'posttest' } });
  console.log(res.getContent());
}

/**
 * Mengirim respons UJI ke formulir pretest. HANYA jalankan sebelum penelitian,
 * lalu hapus barisnya dari spreadsheet. Isi jawaban sesuai ID soal formulir Anda.
 */
function test_submit_pretest_MANUAL() {
  const payload = {
    action: 'submitQuiz',
    quiz: 'pretest',
    clientSubmissionId: 'uji-coba-' + Date.now(),
    answers: {
      // 'ID_SOAL': 'jawaban',
    },
  };
  const res = doPost({ postData: { contents: JSON.stringify(payload) } });
  console.log(res.getContent());
}
