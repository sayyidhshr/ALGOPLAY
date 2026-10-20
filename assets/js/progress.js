/* ALGOPLAY — penanda tahap lokal (localStorage).
 * Status ini hanya tersimpan di browser pengguna dan BUKAN bukti resmi
 * penyelesaian. Verifikasi resmi dilakukan lewat data respons di spreadsheet. */
(function () {
  "use strict";
  window.AlgoPlay = window.AlgoPlay || {};

  var KEY = "algoplay.progress.v1";
  var STEPS = [
    { key: "pretest", title: "Pre-test", href: "pretest.html" },
    { key: "played", title: "Bermain ALGOPLAY", href: "akses-game.html" },
    { key: "posttest", title: "Post-test", href: "posttest.html" },
    { key: "evaluation", title: "Evaluasi", href: "evaluasi.html" },
  ];

  function empty() {
    var o = {};
    STEPS.forEach(function (s) {
      o[s.key] = { status: "not_started", at: null };
    });
    return o;
  }

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var parsed = JSON.parse(raw);
      var base = empty();
      Object.keys(base).forEach(function (k) {
        if (parsed[k] && typeof parsed[k] === "object") base[k] = parsed[k];
      });
      return base;
    } catch (e) {
      return empty();
    }
  }

  function set(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* penyimpanan tidak tersedia: abaikan */
    }
    render();
  }

  function update(stepKey, patch) {
    var state = get();
    if (!state[stepKey]) return;
    Object.keys(patch).forEach(function (k) {
      state[stepKey][k] = patch[k];
    });
    set(state);
  }

  function markDone(stepKey, extra) {
    var patch = { status: "done", at: new Date().toISOString() };
    if (extra) Object.keys(extra).forEach(function (k) { patch[k] = extra[k]; });
    update(stepKey, patch);
  }

  function markInProgress(stepKey) {
    var state = get();
    if (state[stepKey] && state[stepKey].status === "done") return;
    update(stepKey, { status: "in_progress", at: new Date().toISOString() });
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      /* abaikan */
    }
    render();
  }

  function labelFor(status) {
    return status === "done" ? "Selesai" : status === "in_progress" ? "Sedang dikerjakan" : "Belum dimulai";
  }

  function badgeClass(status) {
    return status === "done" ? "badge--done" : status === "in_progress" ? "badge--progress" : "badge--todo";
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      return "";
    }
  }

  /** Render rail ke semua elemen [data-progress-rail]. */
  function render() {
    var mounts = document.querySelectorAll("[data-progress-rail]");
    if (!mounts.length) return;
    var state = get();
    var esc = window.AlgoPlay.escapeHtml || function (s) { return String(s); };

    mounts.forEach(function (mount) {
      var html = '<ol class="rail" aria-label="Alur pembelajaran">';
      STEPS.forEach(function (s, i) {
        var st = state[s.key] || { status: "not_started" };
        var cls = st.status === "done" ? "is-done" : st.status === "in_progress" ? "is-progress" : "";
        var meta = st.at ? fmtDate(st.at) : "";
        html +=
          '<li class="rail__step ' + cls + '">' +
          '<span class="rail__num" aria-hidden="true">' + (i + 1) + "</span>" +
          "<div>" +
          '<p class="rail__title"><a href="' + s.href + '">' + esc(s.title) + "</a></p>" +
          '<span class="badge ' + badgeClass(st.status) + '">' + labelFor(st.status) + "</span>" +
          (meta ? '<p class="rail__meta">' + esc(meta) + "</p>" : "") +
          "</div></li>";
      });
      html += "</ol>";
      html +=
        '<p class="rail-caption">Status ini tersimpan di browser ini saja dan bukan bukti resmi penyelesaian. ' +
        "Penyelesaian diverifikasi pengelola melalui data respons yang masuk.</p>";
      mount.innerHTML = html;
    });
  }

  window.AlgoPlay.progress = {
    STEPS: STEPS,
    get: get,
    set: set,
    update: update,
    markDone: markDone,
    markInProgress: markInProgress,
    reset: reset,
    render: render,
    labelFor: labelFor,
    fmtDate: fmtDate,
  };

  document.addEventListener("DOMContentLoaded", render);
})();
