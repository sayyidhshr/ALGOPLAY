/* ALGOPLAY — mesin kuis kustom.
 * Dipasang pada <main data-quiz="pretest|posttest|evaluation">.
 * Status: intro → loading → ready → submitting → success | error | config_error
 * Tidak pernah menampilkan "berhasil" kecuali server menjawab ok:true & submitted:true. */
(function () {
  "use strict";
  window.AlgoPlay = window.AlgoPlay || {};
  var A = window.AlgoPlay;
  var cfg = window.ALGOPLAY_CONFIG || {};

  var NEXT_STEP = {
    pretest: { href: "akses-game.html", label: "Lanjut ke Akses Game", progressKey: "pretest" },
    posttest: { href: "evaluasi.html", label: "Lanjut ke Evaluasi", progressKey: "posttest" },
    evaluation: { href: "selesai.html", label: "Lihat ringkasan", progressKey: "evaluation" },
  };

  var ICON_WARN =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
  var ICON_INFO =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 10v6m0-9h.01"/></svg>';
  var ICON_OK =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';

  var esc = A.escapeHtml || function (s) { return String(s); };

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    var t = Date.now().toString(16);
    var r = "";
    for (var i = 0; i < 20; i++) r += Math.floor(Math.random() * 16).toString(16);
    return "ap-" + t + "-" + r;
  }

  function Quiz(root) {
    this.root = root;
    this.quizKey = root.getAttribute("data-quiz");
    this.mount = root.querySelector("[data-quiz-mount]");
    this.intro = root.querySelector("[data-quiz-intro]");
    this.model = null;
    this.answers = {};
    this.submissionId = null; // dibuat sekali per percobaan payload, dipakai ulang saat retry
    this.lastPayloadKey = null;
    this.state = "intro";
    this.draftKey = "algoplay.draft." + this.quizKey;
    this.init();
  }

  Quiz.prototype.init = function () {
    var self = this;
    var startBtn = this.root.querySelector("[data-quiz-start]");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        if (self.intro) self.intro.classList.add("hidden");
        self.load();
      });
    } else {
      this.load();
    }
    if (A.api && A.api.isMock) this.renderMockBanner();
  };

  Quiz.prototype.renderMockBanner = function () {
    var b = document.createElement("div");
    b.className = "mock-banner";
    b.setAttribute("role", "status");
    b.innerHTML =
      '<span class="badge badge--mock">MODE PRATINJAU</span>' +
      "<span>Backend belum dikonfigurasi. Soal di bawah adalah contoh dan <strong>jawaban tidak dikirim ke mana pun</strong>. " +
      "Pengelola: isi <code>appsScriptUrl</code> dan set <code>mockMode: false</code> di <code>assets/js/config.js</code>.</span>";
    var host = this.root.querySelector(".quiz-wrap") || this.root;
    host.insertBefore(b, host.firstChild);
  };

  /* ---------------- Memuat soal ---------------- */

  Quiz.prototype.load = function () {
    var self = this;
    this.state = "loading";
    if (A.progress) A.progress.markInProgress(NEXT_STEP[this.quizKey].progressKey);
    this.mount.innerHTML =
      '<div class="card quiz-status" role="status" aria-live="polite"><div class="spinner" aria-hidden="true"></div><div><strong>Memuat pertanyaan…</strong><br><span class="text-muted">Mengambil soal dari formulir.</span></div></div>';

    if (!A.api) {
      this.renderConfigError("Skrip api.js tidak dimuat.");
      return;
    }
    A.api.getQuiz(this.quizKey).then(function (res) {
      if (!res.ok) {
        self.renderLoadError(res.error);
        return;
      }
      self.model = res.data;
      self.restoreDraft();
      self.renderForm();
    });
  };

  Quiz.prototype.renderLoadError = function (error) {
    var code = error && error.code;
    if (code === "NOT_CONFIGURED" || code === "QUIZ_NOT_CONFIGURED" || code === "UNSUPPORTED_QUESTION_TYPE" || code === "BAD_RESPONSE" || code === "INVALID_QUIZ") {
      this.renderConfigError(error.message, error.details);
      return;
    }
    var self = this;
    this.state = "error";
    var msg = (error && error.message) || "Pertanyaan tidak dapat dimuat.";
    this.mount.innerHTML =
      '<div class="card state-card" role="alert">' +
      '<div class="notice notice--danger"><span class="notice__icon">' + ICON_WARN + "</span><div><strong>Pertanyaan gagal dimuat.</strong><p>" + esc(msg) + "</p></div></div>" +
      '<div class="btn-row"><button type="button" class="btn btn--primary" data-retry-load>Coba muat lagi</button>' +
      '<a class="btn btn--ghost" href="faq.html">Lihat bantuan</a></div></div>';
    this.mount.querySelector("[data-retry-load]").addEventListener("click", function () { self.load(); });
  };

  Quiz.prototype.renderConfigError = function (message, details) {
    this.state = "config_error";
    var detailHtml = "";
    if (Array.isArray(details) && details.length) {
      detailHtml = '<ul class="err-details">' + details.map(function (d) {
        return "<li><code>" + esc(d.type || d.code || "") + "</code> " + esc(d.title || d.message || "") + "</li>";
      }).join("") + "</ul>";
    }
    this.mount.innerHTML =
      '<div class="card state-card" role="alert">' +
      '<div class="notice notice--warn"><span class="notice__icon">' + ICON_WARN + "</span><div>" +
      "<strong>Konfigurasi kuis belum lengkap.</strong>" +
      "<p>" + esc(message || "") + "</p>" + detailHtml +
      "<p class=\"mb-0\">Halaman ini belum bisa digunakan untuk pengambilan data. Hubungi pengelola. Panduan teknis ada di <code>docs/DEPLOYMENT.md</code>.</p>" +
      "</div></div>" +
      '<div class="btn-row"><a class="btn btn--ghost" href="index.html">Kembali ke beranda</a></div></div>';
  };

  /* ---------------- Draft lokal ---------------- */

  Quiz.prototype.saveDraft = function () {
    try {
      sessionStorage.setItem(this.draftKey, JSON.stringify(this.answers));
    } catch (e) { /* abaikan */ }
  };
  Quiz.prototype.restoreDraft = function () {
    try {
      var raw = sessionStorage.getItem(this.draftKey);
      if (raw) this.answers = JSON.parse(raw) || {};
    } catch (e) { this.answers = {}; }
  };
  Quiz.prototype.clearDraft = function () {
    try { sessionStorage.removeItem(this.draftKey); } catch (e) { /* abaikan */ }
  };

  /* ---------------- Render formulir ---------------- */

  Quiz.prototype.answerable = function () {
    return this.model.questions.filter(function (q) { return q.type !== "SECTION_HEADER"; });
  };

  Quiz.prototype.renderForm = function () {
    var self = this;
    var m = this.model;
    this.state = "ready";

    var html = "";
    html +=
      '<div class="quiz-progress" aria-live="polite"><div class="quiz-progress__row"><span data-progress-text>Terjawab 0 dari 0</span><span data-progress-pct>0%</span></div>' +
      '<div class="quiz-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Kemajuan pengisian"><div class="quiz-progress__fill" data-progress-fill></div></div></div>';

    html += '<header class="quiz-head"><span class="eyebrow">' + esc(m.label) + "</span><h2>" + esc(m.title) + "</h2>" +
      (m.description ? "<p>" + esc(m.description) + "</p>" : "") + "</header>";

    if (!m.acceptingResponses) {
      html += '<div class="notice notice--danger" role="alert"><span class="notice__icon">' + ICON_WARN + '</span><div><strong>Formulir ini sedang tidak menerima respons.</strong><p class="mb-0">Hubungi pendamping sebelum melanjutkan.</p></div></div>';
    }

    if (m.scoring && !m.scoring.available && m.isQuiz !== false && this.quizKey !== "evaluation") {
      html += '<div class="notice notice--neutral"><span class="notice__icon">' + ICON_INFO + "</span><div><strong>Skor otomatis tidak tersedia untuk formulir ini.</strong><p class=\"mb-0\">" + esc(m.scoring.reason || "") + " Jawaban tetap tersimpan.</p></div></div>";
    }

    html += '<form novalidate data-quiz-form class="mt-1">';
    m.questions.forEach(function (q) { html += self.renderQuestion(q); });
    html +=
      '<div class="quiz-actions"><p>Periksa kembali jawabanmu. Setelah dikirim, jawaban tidak dapat diubah.</p>' +
      '<button type="submit" class="btn btn--primary" data-submit' + (m.acceptingResponses ? "" : " disabled") + ">Kirim jawaban</button></div>" +
      '<div data-form-alert class="mt-1" aria-live="assertive"></div>' +
      "</form>";

    html +=
      '<dialog class="dialog" data-confirm><div class="dialog__body"><h3 id="confirm-title">Kirim jawaban?</h3>' +
      '<p>Jawaban akan dikirim dan <strong>tidak dapat diubah</strong> setelahnya. Pastikan semua sudah sesuai.</p>' +
      '<div class="btn-row"><button type="button" class="btn btn--ghost" data-confirm-cancel>Periksa lagi</button>' +
      '<button type="button" class="btn btn--primary" data-confirm-ok>Ya, kirim</button></div></div></dialog>';

    this.mount.innerHTML = html;
    this.form = this.mount.querySelector("[data-quiz-form]");
    this.bindForm();
    this.updateProgress();
    var firstHeading = this.mount.querySelector(".quiz-head h2");
    if (firstHeading) {
      firstHeading.setAttribute("tabindex", "-1");
      firstHeading.focus({ preventScroll: true });
    }
  };

  Quiz.prototype.renderQuestion = function (q) {
    var id = "q-" + q.id;
    var saved = this.answers[q.id];

    if (q.type === "SECTION_HEADER") {
      return '<section class="q-card q-card--section"><h3>' + esc(q.title) + "</h3>" + (q.helpText ? "<p>" + esc(q.helpText) + "</p>" : "") + "</section>";
    }

    var req = q.required ? ' <span class="q-card__req" aria-hidden="true">*</span><span class="sr-only">(wajib)</span>' : "";
    var pts = q.points > 0 ? '<span class="badge q-card__pts">' + q.points + " poin</span>" : "";
    var head =
      '<div class="q-card__top"><span class="q-card__num" aria-hidden="true">' + q.index + "</span>" +
      '<p class="q-card__title" id="' + id + '-label">' + esc(q.title) + req + "</p>" + pts + "</div>" +
      (q.helpText ? '<p class="q-card__help" id="' + id + '-help">' + esc(q.helpText) + "</p>" : "");
    var describedBy = q.helpText ? ' aria-describedby="' + id + '-help"' : "";

    var body = "";
    if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
      var isMulti = q.type === "CHECKBOX";
      var inputType = isMulti ? "checkbox" : "radio";
      var selected = isMulti ? (Array.isArray(saved) ? saved : []) : typeof saved === "string" ? [saved] : [];
      var otherVal = "";
      selected.forEach(function (v) { if (q.choices.indexOf(v) === -1) otherVal = v; });

      body += '<div class="choices" role="' + (isMulti ? "group" : "radiogroup") + '" aria-labelledby="' + id + '-label"' + describedBy + ">";
      q.choices.forEach(function (c, i) {
        var checked = selected.indexOf(c) !== -1 ? " checked" : "";
        body +=
          '<label class="choice"><input type="' + inputType + '" name="' + id + '" value="' + esc(c) + '" data-qid="' + q.id + '"' + checked + ' /><span>' + esc(c) + "</span></label>";
      });
      if (q.hasOtherOption) {
        body +=
          '<label class="choice"><input type="' + inputType + '" name="' + id + '" value="__other__" data-qid="' + q.id + '" data-other-toggle' + (otherVal ? " checked" : "") + ' /><span>Lainnya</span></label>' +
          '<div class="choice__other' + (otherVal ? "" : " hidden") + '" data-other-wrap><label class="sr-only" for="' + id + '-other">Jawaban lainnya</label>' +
          '<input class="field" type="text" id="' + id + '-other" data-other-input data-qid="' + q.id + '" maxlength="2000" placeholder="Tulis jawabanmu" value="' + esc(otherVal) + '" /></div>';
      }
      body += "</div>";
    } else if (q.type === "LIST") {
      body += '<select class="field" id="' + id + '" data-qid="' + q.id + '" aria-labelledby="' + id + '-label"' + describedBy + '><option value="">— Pilih salah satu —</option>';
      q.choices.forEach(function (c) {
        body += '<option value="' + esc(c) + '"' + (saved === c ? " selected" : "") + ">" + esc(c) + "</option>";
      });
      body += "</select>";
    } else if (q.type === "TEXT") {
      body += '<input class="field" type="text" id="' + id + '" data-qid="' + q.id + '" maxlength="' + (q.maxLength || 2000) + '" aria-labelledby="' + id + '-label"' + describedBy + ' value="' + esc(saved || "") + '" autocomplete="off" />';
    } else if (q.type === "PARAGRAPH_TEXT") {
      var max = q.maxLength || 5000;
      body += '<textarea class="field" id="' + id + '" data-qid="' + q.id + '" maxlength="' + max + '" aria-labelledby="' + id + '-label"' + describedBy + ">" + esc(saved || "") + "</textarea>" +
        '<div class="field-counter"><span data-counter-for="' + q.id + '">' + ((saved || "").length) + "</span>/" + max + "</div>";
    }

    return '<section class="q-card" data-qcard="' + q.id + '">' + head + '<div class="q-card__body">' + body + '<div data-q-error></div></div></section>';
  };

  /* ---------------- Interaksi formulir ---------------- */

  Quiz.prototype.bindForm = function () {
    var self = this;
    var form = this.form;

    form.addEventListener("input", function (e) { self.onFieldChange(e.target); });
    form.addEventListener("change", function (e) { self.onFieldChange(e.target); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (self.state === "submitting") return;
      self.collectAnswers();
      var invalid = self.validateClient();
      if (invalid.length) {
        self.showErrors(invalid, true);
        return;
      }
      self.openConfirm();
    });

    var dialog = this.mount.querySelector("[data-confirm]");
    dialog.querySelector("[data-confirm-cancel]").addEventListener("click", function () { self.closeConfirm(); });
    dialog.querySelector("[data-confirm-ok]").addEventListener("click", function () {
      self.closeConfirm();
      self.submit();
    });
  };

  Quiz.prototype.onFieldChange = function (el) {
    if (!el || !el.getAttribute) return;
    var qid = el.getAttribute("data-qid");
    if (!qid) return;
    if (el.hasAttribute("data-other-toggle")) {
      var wrap = el.closest(".choices").querySelector("[data-other-wrap]");
      if (wrap) {
        wrap.classList.toggle("hidden", !el.checked);
        if (el.checked) wrap.querySelector("input").focus();
      }
    }
    var counter = this.form.querySelector('[data-counter-for="' + qid + '"]');
    if (counter && el.tagName === "TEXTAREA") counter.textContent = String(el.value.length);

    this.collectAnswers();
    this.clearError(qid);
    this.updateProgress();
    this.saveDraft();
  };

  Quiz.prototype.collectAnswers = function () {
    var self = this;
    var answers = {};
    this.answerable().forEach(function (q) {
      var id = "q-" + q.id;
      if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
        var checked = Array.prototype.slice.call(self.form.querySelectorAll('input[name="' + id + '"]:checked'));
        var vals = [];
        checked.forEach(function (inp) {
          if (inp.value === "__other__") {
            var other = self.form.querySelector("#" + id + "-other");
            var t = other ? other.value.trim() : "";
            if (t) vals.push(t);
          } else {
            vals.push(inp.value);
          }
        });
        if (q.type === "CHECKBOX") { if (vals.length) answers[q.id] = vals; }
        else if (vals.length) answers[q.id] = vals[0];
      } else {
        var el = self.form.querySelector("#" + id);
        var v = el ? el.value.trim() : "";
        if (v) answers[q.id] = v;
      }
    });
    this.answers = answers;
  };

  Quiz.prototype.updateProgress = function () {
    var list = this.answerable();
    var done = 0;
    var self = this;
    list.forEach(function (q) { if (self.answers[q.id] !== undefined) done += 1; });
    var pct = list.length ? Math.round((done / list.length) * 100) : 0;
    var t = this.mount.querySelector("[data-progress-text]");
    var p = this.mount.querySelector("[data-progress-pct]");
    var f = this.mount.querySelector("[data-progress-fill]");
    var bar = this.mount.querySelector('[role="progressbar"]');
    if (t) t.textContent = "Terjawab " + done + " dari " + list.length;
    if (p) p.textContent = pct + "%";
    if (f) { f.style.width = pct + "%"; f.classList.toggle("is-complete", pct === 100); }
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
  };

  /* ---------------- Validasi klien ---------------- */

  Quiz.prototype.validateClient = function () {
    var self = this;
    var invalid = [];
    this.answerable().forEach(function (q) {
      var a = self.answers[q.id];
      if (q.required && a === undefined) {
        invalid.push({ questionId: q.id, message: "Pertanyaan ini wajib dijawab." });
        return;
      }
      if (q.hasOtherOption && (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX")) {
        var toggle = self.form.querySelector('input[name="q-' + q.id + '"][value="__other__"]');
        var other = self.form.querySelector("#q-" + q.id + "-other");
        if (toggle && toggle.checked && other && !other.value.trim()) {
          invalid.push({ questionId: q.id, message: 'Isi jawaban untuk pilihan "Lainnya" atau pilih opsi lain.' });
        }
      }
      if ((q.type === "TEXT" || q.type === "PARAGRAPH_TEXT") && typeof a === "string" && q.maxLength && a.length > q.maxLength) {
        invalid.push({ questionId: q.id, message: "Jawaban melebihi batas " + q.maxLength + " karakter." });
      }
    });
    return invalid;
  };

  Quiz.prototype.showErrors = function (list, focusFirst) {
    var self = this;
    list.forEach(function (err, i) {
      var card = self.form.querySelector('[data-qcard="' + err.questionId + '"]');
      if (!card) return;
      card.classList.add("is-invalid");
      var slot = card.querySelector("[data-q-error]");
      slot.innerHTML = '<p class="q-error" role="alert">' + ICON_WARN + "<span>" + esc(err.message) + "</span></p>";
      if (i === 0 && focusFirst) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        var input = card.querySelector("input, select, textarea");
        if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, 350);
      }
    });
    var alertBox = this.mount.querySelector("[data-form-alert]");
    if (alertBox) {
      alertBox.innerHTML =
        '<div class="notice notice--danger"><span class="notice__icon">' + ICON_WARN + "</span><div><strong>" + list.length + " pertanyaan perlu diperiksa.</strong><p class=\"mb-0\">Lengkapi yang bertanda merah, lalu kirim lagi.</p></div></div>";
    }
  };

  Quiz.prototype.clearError = function (qid) {
    var card = this.form.querySelector('[data-qcard="' + qid + '"]');
    if (!card) return;
    card.classList.remove("is-invalid");
    var slot = card.querySelector("[data-q-error]");
    if (slot) slot.innerHTML = "";
    var alertBox = this.mount.querySelector("[data-form-alert]");
    if (alertBox && !this.form.querySelector(".q-card.is-invalid")) alertBox.innerHTML = "";
  };

  /* ---------------- Konfirmasi ---------------- */

  Quiz.prototype.openConfirm = function () {
    var d = this.mount.querySelector("[data-confirm]");
    if (typeof d.showModal === "function") d.showModal();
    else if (window.confirm("Kirim jawaban? Jawaban tidak dapat diubah.")) this.submit();
  };
  Quiz.prototype.closeConfirm = function () {
    var d = this.mount.querySelector("[data-confirm]");
    if (d && d.open) d.close();
  };

  /* ---------------- Pengiriman ---------------- */

  Quiz.prototype.setSubmitting = function (on) {
    var btn = this.form.querySelector("[data-submit]");
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on ? '<span class="spinner" style="width:18px;height:18px;border-width:3px" aria-hidden="true"></span> Mengirim…' : "Kirim jawaban";
    Array.prototype.forEach.call(this.form.querySelectorAll("input, select, textarea"), function (el) { el.disabled = on; });
  };

  Quiz.prototype.submit = function () {
    var self = this;
    this.collectAnswers();
    var payloadKey = JSON.stringify(this.answers);
    // ID idempotensi dipakai ulang jika payload tidak berubah (retry aman).
    if (!this.submissionId || this.lastPayloadKey !== payloadKey) {
      this.submissionId = uuid();
      this.lastPayloadKey = payloadKey;
    }
    this.state = "submitting";
    this.setSubmitting(true);
    var alertBox = this.mount.querySelector("[data-form-alert]");
    if (alertBox) alertBox.innerHTML = '<div class="notice notice--info" role="status"><span class="notice__icon">' + ICON_INFO + "</span><div><strong>Mengirim jawaban…</strong><p class=\"mb-0\">Jangan tutup atau muat ulang halaman ini.</p></div></div>";

    A.api.submitQuiz(this.quizKey, this.answers, this.submissionId).then(function (res) {
      if (res.ok && res.data && res.data.submitted === true) {
        self.onSuccess(res.data);
      } else {
        self.onSubmitError(res.error || { code: "UNKNOWN", message: "Pengiriman tidak dikonfirmasi server." });
      }
    });
  };

  Quiz.prototype.onSubmitError = function (error) {
    var self = this;
    this.state = "ready";
    this.setSubmitting(false);
    var alertBox = this.mount.querySelector("[data-form-alert]");
    var code = error.code;

    if (code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
      var mapped = error.details.map(function (d) { return { questionId: d.questionId, message: d.message }; });
      this.showErrors(mapped, true);
      if (mapped.some(function (d) { return !self.form.querySelector('[data-qcard="' + d.questionId + '"]'); })) {
        alertBox.innerHTML += '<div class="notice notice--warn mt-1"><span class="notice__icon">' + ICON_WARN + '</span><div>Formulir tampaknya berubah sejak dimuat. <button type="button" class="btn btn--sm" data-retry-load>Muat ulang soal</button></div></div>';
        alertBox.querySelector("[data-retry-load]").addEventListener("click", function () { self.load(); });
      }
      return;
    }

    if (code === "NOT_CONFIGURED" || code === "QUIZ_NOT_CONFIGURED" || code === "INVALID_QUIZ" || code === "BAD_RESPONSE" || code === "UNSUPPORTED_QUESTION_TYPE") {
      this.renderConfigError(error.message, error.details);
      return;
    }

    var title, body, kind = "danger", canRetry = true;
    switch (code) {
      case "FORM_NOT_ACCEPTING":
        title = "Formulir sedang tidak menerima respons.";
        body = "Hubungi pendamping. Jawabanmu masih tersimpan di halaman ini.";
        canRetry = false;
        break;
      case "NETWORK_ERROR":
        title = "Tidak dapat terhubung ke server.";
        body = "Periksa koneksi internet, lalu coba kirim lagi. Jawabanmu tidak hilang.";
        break;
      case "TIMEOUT":
        title = "Server tidak merespons dan status pengiriman tidak pasti.";
        body = "Jangan mengirim berkali-kali. Coba sekali lagi; jika tetap gagal, hubungi pendamping agar respons diperiksa di spreadsheet sebelum mengulang.";
        kind = "warn";
        break;
      case "BUSY":
        title = "Server sedang sibuk.";
        body = "Tunggu beberapa detik lalu coba kirim lagi.";
        kind = "warn";
        break;
      case "SUBMIT_FAILED":
        title = "Jawaban gagal disimpan ke Google Forms.";
        body = esc(error.message || "") + " Coba sekali lagi; jika berulang, hubungi pendamping.";
        break;
      default:
        title = "Pengiriman gagal.";
        body = esc(error.message || "Terjadi kesalahan yang tidak diketahui.");
    }
    alertBox.innerHTML =
      '<div class="notice notice--' + kind + '" role="alert"><span class="notice__icon">' + ICON_WARN + "</span><div><strong>" + title + "</strong><p>" + body + "</p>" +
      '<div class="btn-row">' + (canRetry ? '<button type="button" class="btn btn--sm btn--primary" data-retry-submit>Coba kirim lagi</button>' : "") +
      '<a class="btn btn--sm btn--ghost" href="faq.html">Bantuan</a></div></div></div>';
    var retry = alertBox.querySelector("[data-retry-submit]");
    if (retry) retry.addEventListener("click", function () { self.submit(); });
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---------------- Hasil ---------------- */

  Quiz.prototype.onSuccess = function (data) {
    this.state = "success";
    this.clearDraft();
    var next = NEXT_STEP[this.quizKey];
    var r = data.result || { available: false };

    if (A.progress) {
      A.progress.markDone(next.progressKey, {
        responseId: data.responseId || null,
        percentage: r.available ? r.percentage : null,
      });
    }

    var html = '<div class="card result reveal" role="status" aria-live="polite">';
    html += '<span class="eyebrow">' + esc(this.model.label) + "</span>";
    html += "<h2>Jawaban berhasil dikirim</h2>";

    if (data.duplicate) {
      html += '<div class="notice notice--info" style="text-align:left"><span class="notice__icon">' + ICON_INFO + '</span><div>Jawaban ini <strong>sudah tercatat sebelumnya</strong>. Tidak ada respons ganda yang dibuat.</div></div>';
    }

    if (r.available) {
      html +=
        '<div class="result__ring" style="--pct:' + Math.max(0, Math.min(100, r.percentage)) + '"><div>' +
        '<span class="result__pct">' + r.percentage + "%</span>" +
        '<span class="result__frac">' + r.score + " / " + r.maxScore + " poin</span></div></div>";
      html += '<div class="result__facts">';
      html += "<div><strong>" + r.correctCount + "/" + r.autoGradedCount + "</strong><span>soal objektif benar</span></div>";
      html += "<div><strong>" + r.autoGradedCount + "</strong><span>soal dinilai otomatis</span></div>";
      if (r.manualReviewCount > 0) html += "<div><strong>" + r.manualReviewCount + "</strong><span>soal diperiksa manual</span></div>";
      html += "<div><strong>" + r.totalQuestions + "</strong><span>total pertanyaan</span></div>";
      html += "</div>";
      if (r.manualReviewCount > 0) {
        html += '<p class="text-muted" style="font-size:var(--fs-sm)">Skor di atas hanya mencakup soal yang dinilai otomatis. Soal uraian akan diperiksa pengelola secara terpisah.</p>';
      }
    } else {
      html += '<div class="notice notice--neutral" style="text-align:left"><span class="notice__icon">' + ICON_INFO + "</span><div><strong>Jawaban tersimpan, skor otomatis tidak tersedia.</strong><p class=\"mb-0\">" + esc(r.reason || "Penilaian untuk formulir ini dilakukan secara manual.") + "</p></div></div>";
    }

    html += '<p class="result__id mt-1">ID respons: ' + esc(data.responseId || "-") + " · " + esc(A.progress ? A.progress.fmtDate(data.submittedAt) : data.submittedAt || "") + "</p>";
    html += '<div class="btn-row" style="justify-content:center;margin-top:1.25rem"><a class="btn btn--primary" href="' + next.href + '">' + next.label + '</a><a class="btn btn--ghost" href="index.html">Beranda</a></div>';
    html += "</div>";

    this.mount.innerHTML = html;
    var progress = this.mount.querySelector(".quiz-progress");
    if (progress) progress.remove();
    var h = this.mount.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- Boot ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-quiz]");
    if (!root || !NEXT_STEP[root.getAttribute("data-quiz")]) return;
    A.quiz = new Quiz(root);
  });
})();
