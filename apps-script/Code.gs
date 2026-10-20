/**
 * ALGOPLAY Quiz Backend — Entry point Web App.
 *
 * GET  ?action=ping
 * GET  ?action=getQuiz&quiz=pretest|posttest|evaluation
 * POST body JSON { action: "submitQuiz", quiz, clientSubmissionId, answers }
 *
 * Semua respons berbentuk JSON { ok, data } atau { ok, error }.
 * Lihat docs/API-CONTRACT.md untuk detail kontrak.
 */

/** @param {GoogleAppsScript.Events.DoGet} e */
function doGet(e) {
  return handleRequest(function () {
    const params = (e && e.parameter) || {};
    const action = String(params.action || '');

    if (action === 'ping') {
      return ok({
        service: 'algoplay-quiz',
        version: SERVICE_VERSION,
        quizzes: listEnabledQuizzes(),
        time: new Date().toISOString(),
      });
    }

    if (action === 'getQuiz') {
      const quizKey = String(params.quiz || '');
      const form = openQuizForm(quizKey);
      const model = buildQuizModel(form, quizKey);
      return ok(model.publicModel);
    }

    throw apiError('INVALID_ACTION', 'Aksi tidak dikenal.');
  });
}

/** @param {GoogleAppsScript.Events.DoPost} e */
function doPost(e) {
  return handleRequest(function () {
    const payload = parseJsonBody(e);
    const action = String(payload.action || '');

    if (action === 'submitQuiz') {
      return ok(submitQuiz(payload));
    }

    throw apiError('INVALID_ACTION', 'Aksi tidak dikenal.');
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Menjalankan handler dan mengubah hasil/kesalahan menjadi respons JSON.
 * @param {function(): Object} fn
 */
function handleRequest(fn) {
  let body;
  try {
    body = fn();
  } catch (err) {
    if (err && err.apiError === true) {
      body = fail(err.code, err.message, err.details);
    } else {
      console.error('INTERNAL_ERROR: ' + (err && err.stack ? err.stack : err));
      body = fail(
        'INTERNAL_ERROR',
        'Terjadi kesalahan pada server. Silakan coba lagi beberapa saat lagi atau hubungi pengelola.'
      );
    }
  }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** @param {Object} data */
function ok(data) {
  return { ok: true, data: data };
}

/**
 * @param {string} code
 * @param {string} message
 * @param {*=} details
 */
function fail(code, message, details) {
  const error = { code: code, message: message };
  if (details !== undefined && details !== null) error.details = details;
  return { ok: false, error: error };
}

/**
 * Membuat objek kesalahan terkontrol yang akan diterjemahkan ke { ok:false }.
 * @param {string} code
 * @param {string} message
 * @param {*=} details
 */
function apiError(code, message, details) {
  return { apiError: true, code: code, message: message, details: details };
}

/**
 * Membaca body POST sebagai JSON, apa pun Content-Type-nya
 * (frontend mengirim text/plain untuk menghindari preflight CORS).
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function parseJsonBody(e) {
  const raw = e && e.postData && e.postData.contents;
  if (!raw) throw apiError('INVALID_PAYLOAD', 'Body permintaan kosong.');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw apiError('INVALID_PAYLOAD', 'Body permintaan bukan JSON yang valid.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw apiError('INVALID_PAYLOAD', 'Body permintaan harus berupa objek JSON.');
  }
  return parsed;
}
