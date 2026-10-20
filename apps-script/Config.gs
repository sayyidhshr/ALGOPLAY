/**
 * ALGOPLAY Quiz Backend — Konfigurasi.
 *
 * PENTING: formId di bawah ini adalah ID EDITOR formulir, yaitu bagian <ID> dari
 *   https://docs.google.com/forms/d/<ID>/edit
 * BUKAN ID publik dari tautan viewform:
 *   https://docs.google.com/forms/d/e/1FAIpQL.../viewform   <-- JANGAN dipakai di sini
 *
 * Cara mendapatkannya: buka formulir sebagai pemilik/editor, salin ID dari URL editor.
 * Akun yang men-deploy web app ini HARUS memiliki akses edit ke ketiga formulir.
 *
 * Setiap kunci (pretest / posttest / evaluation) memiliki formulir dan spreadsheet
 * tujuan masing-masing. Jangan pernah menukar atau menyamakan ID antar tahap.
 */
const QUIZ_CONFIG = {
  pretest: {
    formId: 'REPLACE_WITH_PRETEST_FORM_ID',
    label: 'Pre-test',
    enabled: true,
  },
  posttest: {
    formId: 'REPLACE_WITH_POSTTEST_FORM_ID',
    label: 'Post-test',
    enabled: true,
  },
  evaluation: {
    formId: 'REPLACE_WITH_EVALUATION_FORM_ID',
    label: 'Evaluasi',
    // Aktifkan hanya jika website memakai evaluationMode: "custom".
    enabled: false,
  },
};

const LIMITS = {
  TEXT_MAX: 2000, // batas karakter jawaban singkat
  PARAGRAPH_MAX: 5000, // batas karakter jawaban paragraf
  DEDUP_TTL_SECONDS: 21600, // 6 jam: masa simpan idempotency key
  LOCK_WAIT_MS: 20000, // waktu tunggu lock sebelum menyerah (BUSY)
};

const SERVICE_VERSION = '1.0.0';

/**
 * @param {string} formId
 * @return {boolean} true bila ID belum diisi pengelola.
 */
function isPlaceholder(formId) {
  return !formId || String(formId).indexOf('REPLACE_WITH') === 0;
}

/**
 * Daftar kunci kuis yang aktif (dipakai oleh action=ping).
 * @return {string[]}
 */
function listEnabledQuizzes() {
  return Object.keys(QUIZ_CONFIG).filter(function (key) {
    return QUIZ_CONFIG[key].enabled === true;
  });
}
