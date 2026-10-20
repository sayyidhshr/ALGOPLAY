/* ALGOPLAY — data contoh untuk MODE PRATINJAU (tanpa backend).
 * Tidak dipakai saat appsScriptUrl terisi. Kunci jawaban disimpan di sini hanya
 * untuk simulasi; getQuiz() tidak pernah mengirimkannya ke antarmuka. */
(function () {
  "use strict";
  window.AlgoPlay = window.AlgoPlay || {};

  var LATENCY = 600;

  function q(id, type, title, opts) {
    opts = opts || {};
    return {
      id: String(id),
      index: null,
      type: type,
      title: title,
      helpText: opts.helpText || "",
      required: opts.required !== false,
      choices: opts.choices || [],
      hasOtherOption: !!opts.other,
      points: opts.points || 0,
      autoGraded: !!opts.correct && (opts.points || 0) > 0,
      maxLength: type === "TEXT" ? 2000 : type === "PARAGRAPH_TEXT" ? 5000 : null,
      _correct: opts.correct || [],
    };
  }

  function identityBlock(prefix) {
    return [
      q(prefix + "00", "SECTION_HEADER", "Identitas Peserta", { helpText: "Isi sesuai data yang diberikan guru pendamping. Gunakan kode peserta yang sama pada pre-test dan post-test.", required: false }),
      q(prefix + "01", "TEXT", "Nama lengkap"),
      q(prefix + "02", "LIST", "Kelas", { choices: ["XI RPL 1", "XI RPL 2", "XI PPLG 1", "XI PPLG 2"] }),
      q(prefix + "03", "TEXT", "Kode peserta", { helpText: "Contoh format: AP-01. Tanyakan ke pendamping jika belum punya." }),
    ];
  }

  function questionBank(prefix) {
    return [
      q(prefix + "10", "SECTION_HEADER", "Bagian A — Soal Objektif", { required: false }),
      q(prefix + "11", "MULTIPLE_CHOICE", "Pada array dengan 5 elemen, indeks elemen pertama adalah…", {
        choices: ["1", "0", "5", "-1"], correct: ["0"], points: 10,
      }),
      q(prefix + "12", "MULTIPLE_CHOICE", "Struktur data yang mengikuti prinsip LIFO (Last In, First Out) adalah…", {
        choices: ["Queue", "Array", "Stack", "Linked List"], correct: ["Stack"], points: 10,
      }),
      q(prefix + "13", "MULTIPLE_CHOICE", "Operasi untuk menambahkan elemen ke bagian belakang queue disebut…", {
        choices: ["push", "pop", "enqueue", "dequeue"], correct: ["enqueue"], points: 10,
      }),
      q(prefix + "14", "CHECKBOX", "Pilih semua pernyataan yang BENAR tentang linked list.", {
        helpText: "Boleh memilih lebih dari satu.",
        choices: [
          "Setiap node menyimpan data dan referensi ke node berikutnya",
          "Elemen harus tersimpan berurutan di memori",
          "Node pertama disebut head",
          "Ukurannya tetap sejak dibuat",
        ],
        correct: ["Setiap node menyimpan data dan referensi ke node berikutnya", "Node pertama disebut head"],
        points: 15,
      }),
      q(prefix + "15", "LIST", "Jika stack berisi [A, B, C] dengan C paling atas, hasil pop() adalah…", {
        choices: ["A", "B", "C"], correct: ["C"], points: 10,
      }),
      q(prefix + "16", "MULTIPLE_CHOICE", "Queue berisi 3, 7, 9 (3 di depan). Setelah dequeue() lalu enqueue(4), elemen paling depan adalah…", {
        choices: ["3", "7", "9", "4"], correct: ["7"], points: 15,
      }),
      q(prefix + "17", "MULTIPLE_CHOICE", "Untuk mengakses elemen ke-3 pada array nilai, penulisan yang benar adalah…", {
        choices: ["nilai[3]", "nilai[2]", "nilai(3)", "nilai.3"], correct: ["nilai[2]"], points: 10,
      }),
      q(prefix + "20", "SECTION_HEADER", "Bagian B — Uraian Singkat", { helpText: "Jawaban bagian ini diperiksa secara manual oleh pengelola.", required: false }),
      q(prefix + "21", "TEXT", "Sebutkan satu perbedaan utama antara array dan linked list.", { points: 10 }),
      q(prefix + "22", "PARAGRAPH_TEXT", "Jelaskan dengan kata-katamu sendiri bagaimana cara kerja stack, beserta satu contoh penerapannya.", {
        points: 10, required: false,
      }),
    ];
  }

  var FORMS = {
    pretest: {
      label: "Pre-test",
      title: "Pre-test Struktur Data Linear (CONTOH)",
      description: "Ini adalah data contoh untuk pratinjau tampilan. Jawaban tidak dikirim ke mana pun.",
      questions: identityBlock("p").concat(questionBank("p")),
    },
    posttest: {
      label: "Post-test",
      title: "Post-test Struktur Data Linear (CONTOH)",
      description: "Ini adalah data contoh untuk pratinjau tampilan. Jawaban tidak dikirim ke mana pun.",
      questions: identityBlock("q").concat(questionBank("q")),
    },
    evaluation: {
      label: "Evaluasi",
      title: "Evaluasi ALGOPLAY (CONTOH)",
      description: "Data contoh. Struktur asli mengikuti instrumen evaluasi peneliti.",
      questions: [
        q("e01", "TEXT", "Kode peserta"),
        q("e02", "MULTIPLE_CHOICE", "Visualisasi dalam game membantu saya memahami materi.", {
          choices: ["Sangat setuju", "Setuju", "Netral", "Tidak setuju", "Sangat tidak setuju"],
        }),
        q("e03", "MULTIPLE_CHOICE", "Petunjuk di dalam game mudah dipahami.", {
          choices: ["Sangat setuju", "Setuju", "Netral", "Tidak setuju", "Sangat tidak setuju"],
        }),
        q("e04", "PARAGRAPH_TEXT", "Kritik dan saran untuk ALGOPLAY", { required: false }),
      ],
    },
  };

  function delay(v) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(v); }, LATENCY);
    });
  }

  function publicQuestions(list) {
    var idx = 0;
    return list.map(function (item) {
      var copy = {};
      Object.keys(item).forEach(function (k) {
        if (k !== "_correct") copy[k] = item[k];
      });
      if (item.type !== "SECTION_HEADER") {
        idx += 1;
        copy.index = idx;
      }
      return copy;
    });
  }

  function scoringSummary(list) {
    var auto = 0, manual = 0, max = 0;
    list.forEach(function (it) {
      if (it.autoGraded) { auto += 1; max += it.points; }
      else if ((it.type === "TEXT" || it.type === "PARAGRAPH_TEXT") && it.points > 0) manual += 1;
    });
    return {
      available: auto > 0,
      autoGradedCount: auto,
      manualReviewCount: manual,
      maxScore: max,
      reason: auto > 0 ? null : "Kunci jawaban belum dikonfigurasi (data contoh).",
    };
  }

  function getQuiz(quiz) {
    var f = FORMS[quiz];
    if (!f) return delay({ ok: false, error: { code: "INVALID_QUIZ", message: "Jenis kuis tidak dikenal." } });
    return delay({
      ok: true,
      data: {
        quiz: quiz,
        label: f.label,
        title: f.title,
        description: f.description,
        isQuiz: quiz !== "evaluation",
        acceptingResponses: true,
        scoring: scoringSummary(f.questions),
        questions: publicQuestions(f.questions),
      },
    });
  }

  var submitted = {};

  function submitQuiz(payload) {
    var f = FORMS[payload.quiz];
    if (!f) return delay({ ok: false, error: { code: "INVALID_QUIZ", message: "Jenis kuis tidak dikenal." } });
    var key = payload.quiz + ":" + payload.clientSubmissionId;
    if (submitted[key]) {
      var dup = JSON.parse(JSON.stringify(submitted[key]));
      dup.duplicate = true;
      return delay({ ok: true, data: dup });
    }

    var answers = payload.answers || {};
    var details = [];
    var byId = {};
    f.questions.forEach(function (it) { byId[it.id] = it; });

    Object.keys(answers).forEach(function (id) {
      var it = byId[id];
      if (!it || it.type === "SECTION_HEADER") {
        details.push({ questionId: id, code: "INVALID_QUESTION_ID", message: "Pertanyaan tidak ditemukan." });
        return;
      }
      var v = answers[id];
      if (it.type === "CHECKBOX") {
        if (!Array.isArray(v)) { details.push({ questionId: id, code: "INVALID_TYPE", message: "Harus berupa daftar." }); return; }
        v.forEach(function (c) {
          if (it.choices.indexOf(c) === -1 && !it.hasOtherOption) details.push({ questionId: id, code: "INVALID_CHOICE", message: "Pilihan tidak tersedia." });
        });
      } else if (typeof v !== "string") {
        details.push({ questionId: id, code: "INVALID_TYPE", message: "Harus berupa teks." });
      } else if ((it.type === "MULTIPLE_CHOICE" || it.type === "LIST") && v && it.choices.indexOf(v) === -1 && !it.hasOtherOption) {
        details.push({ questionId: id, code: "INVALID_CHOICE", message: "Pilihan tidak tersedia." });
      }
    });

    f.questions.forEach(function (it) {
      if (it.type === "SECTION_HEADER" || !it.required) return;
      var v = answers[it.id];
      var empty = v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
      if (empty && !details.some(function (d) { return d.questionId === it.id; })) {
        details.push({ questionId: it.id, code: "REQUIRED_MISSING", message: "Pertanyaan ini wajib dijawab." });
      }
    });

    if (details.length) {
      return delay({ ok: false, error: { code: "VALIDATION_ERROR", message: "Beberapa jawaban belum valid.", details: details } });
    }

    var sc = scoringSummary(f.questions);
    var score = 0, correct = 0, total = 0;
    f.questions.forEach(function (it) {
      if (it.type !== "SECTION_HEADER") total += 1;
      if (!it.autoGraded) return;
      var v = answers[it.id];
      var ok = false;
      if (it.type === "CHECKBOX") {
        var a = (v || []).slice().sort(), k = it._correct.slice().sort();
        ok = a.length === k.length && a.every(function (x, i) { return x === k[i]; });
      } else {
        ok = it._correct.indexOf(v) !== -1;
      }
      if (ok) { score += it.points; correct += 1; }
    });

    var data = {
      submitted: true,
      duplicate: false,
      quiz: payload.quiz,
      responseId: "MOCK-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      submittedAt: new Date().toISOString(),
      result: sc.available
        ? {
            available: true,
            score: score,
            maxScore: sc.maxScore,
            percentage: sc.maxScore ? Math.round((score / sc.maxScore) * 1000) / 10 : 0,
            autoGradedCount: sc.autoGradedCount,
            correctCount: correct,
            manualReviewCount: sc.manualReviewCount,
            totalQuestions: total,
            reason: null,
          }
        : {
            available: false, score: null, maxScore: null, percentage: null,
            autoGradedCount: 0, correctCount: null, manualReviewCount: sc.manualReviewCount,
            totalQuestions: total, reason: sc.reason,
          },
    };
    submitted[key] = data;
    return delay({ ok: true, data: data });
  }

  window.AlgoPlay.mock = { getQuiz: getQuiz, submitQuiz: submitQuiz };
})();
