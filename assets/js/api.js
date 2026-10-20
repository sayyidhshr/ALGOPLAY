/* ALGOPLAY — klien API ke Google Apps Script (lihat docs/API-CONTRACT.md).
 * Mengembalikan selalu { ok, data } atau { ok:false, error:{code,message,details} };
 * tidak pernah melempar ke pemanggil. */
(function () {
  "use strict";
  window.AlgoPlay = window.AlgoPlay || {};
  var cfg = window.ALGOPLAY_CONFIG || {};
  var BASE = (cfg.appsScriptUrl || "").trim();
  var TIMEOUT_MS = 30000;

  var isMock = !BASE && cfg.mockMode === true;
  var notConfigured = !BASE && !isMock;

  function errorResult(code, message, details) {
    var e = { code: code, message: message };
    if (details) e.details = details;
    return { ok: false, error: e };
  }

  function withTimeout(promiseFactory) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, TIMEOUT_MS);
    return promiseFactory(controller ? controller.signal : undefined).then(
      function (r) {
        clearTimeout(timer);
        return r;
      },
      function (err) {
        clearTimeout(timer);
        throw err;
      }
    );
  }

  function parseResponse(res) {
    return res.text().then(function (text) {
      var json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return errorResult(
          "BAD_RESPONSE",
          "Server mengirim balasan yang tidak dapat dibaca. Periksa URL Apps Script dan pengaturan deployment (akses: Anyone)."
        );
      }
      if (!json || typeof json.ok !== "boolean") {
        return errorResult("BAD_RESPONSE", "Format balasan server tidak sesuai kontrak.");
      }
      return json;
    });
  }

  function networkError(err) {
    var aborted = err && (err.name === "AbortError");
    return errorResult(
      aborted ? "TIMEOUT" : "NETWORK_ERROR",
      aborted
        ? "Server tidak merespons dalam 30 detik. Status pengiriman tidak pasti."
        : "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
    );
  }

  function get(params) {
    var qs = Object.keys(params)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");
    return withTimeout(function (signal) {
      return fetch(BASE + "?" + qs, { method: "GET", redirect: "follow", signal: signal });
    })
      .then(parseResponse)
      .catch(networkError);
  }

  function post(payload) {
    return withTimeout(function (signal) {
      return fetch(BASE, {
        method: "POST",
        redirect: "follow",
        // text/plain menghindari preflight CORS; Apps Script membaca body apa adanya.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: signal,
      });
    })
      .then(parseResponse)
      .catch(networkError);
  }

  function requireMock() {
    if (!window.AlgoPlay.mock) {
      return Promise.resolve(errorResult("NOT_CONFIGURED", "Mode pratinjau aktif, tetapi mock-data.js tidak dimuat."));
    }
    return null;
  }

  var api = {
    isMock: isMock,
    notConfigured: notConfigured,

    ping: function () {
      if (isMock) return Promise.resolve({ ok: true, data: { service: "mock", version: "mock", quizzes: ["pretest", "posttest"] } });
      if (notConfigured) return Promise.resolve(errorResult("NOT_CONFIGURED", "URL Apps Script belum diisi di config.js."));
      return get({ action: "ping" });
    },

    getQuiz: function (quiz) {
      if (isMock) return requireMock() || window.AlgoPlay.mock.getQuiz(quiz);
      if (notConfigured) return Promise.resolve(errorResult("NOT_CONFIGURED", "URL Apps Script belum diisi di config.js."));
      return get({ action: "getQuiz", quiz: quiz });
    },

    submitQuiz: function (quiz, answers, clientSubmissionId) {
      var payload = { action: "submitQuiz", quiz: quiz, clientSubmissionId: clientSubmissionId, answers: answers };
      if (isMock) return requireMock() || window.AlgoPlay.mock.submitQuiz(payload);
      if (notConfigured) return Promise.resolve(errorResult("NOT_CONFIGURED", "URL Apps Script belum diisi di config.js."));
      return post(payload);
    },
  };

  window.AlgoPlay.api = api;
})();
