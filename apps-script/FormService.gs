/**
 * ALGOPLAY Quiz Backend — Akses Google Forms & pembentukan model kuis.
 *
 * Model dibangun ulang pada setiap permintaan (tanpa cache) agar perubahan
 * pertanyaan/kunci jawaban di Google Forms langsung terbaca. Ini sengaja
 * dipilih demi integritas data penelitian; beban formulir kecil.
 */

const SUPPORTED_TYPES = ['MULTIPLE_CHOICE', 'LIST', 'CHECKBOX', 'TEXT', 'PARAGRAPH_TEXT', 'SECTION_HEADER'];
const SKIPPED_TYPES = ['PAGE_BREAK', 'IMAGE', 'VIDEO'];
const CHOICE_TYPES = ['MULTIPLE_CHOICE', 'LIST', 'CHECKBOX'];
const TEXT_TYPES = ['TEXT', 'PARAGRAPH_TEXT'];

/**
 * Memvalidasi kunci kuis dan membuka formulir yang sesuai.
 * @param {string} quizKey
 * @return {GoogleAppsScript.Forms.Form}
 */
function openQuizForm(quizKey) {
  const cfg = QUIZ_CONFIG[quizKey];
  if (!cfg || cfg.enabled !== true || !Object.prototype.hasOwnProperty.call(QUIZ_CONFIG, quizKey)) {
    throw apiError('INVALID_QUIZ', 'Jenis kuis tidak dikenal atau tidak aktif.');
  }
  if (isPlaceholder(cfg.formId)) {
    throw apiError(
      'QUIZ_NOT_CONFIGURED',
      'ID formulir ' + cfg.label + ' belum diatur oleh pengelola (Config.gs).'
    );
  }
  try {
    return FormApp.openById(cfg.formId);
  } catch (err) {
    console.error('openById gagal untuk ' + quizKey + ': ' + err);
    throw apiError(
      'QUIZ_NOT_CONFIGURED',
      'Formulir ' + cfg.label + ' tidak dapat dibuka. Periksa ID dan izin akses akun pemilik skrip.'
    );
  }
}

/**
 * Membangun model kuis dari formulir.
 * @param {GoogleAppsScript.Forms.Form} form
 * @param {string} quizKey
 * @return {{publicModel: Object, byId: Object<string, Object>, scoring: Object, isQuiz: boolean}}
 */
function buildQuizModel(form, quizKey) {
  const cfg = QUIZ_CONFIG[quizKey];
  const isQuiz = form.isQuiz();
  const items = form.getItems();
  const questions = [];
  const byId = {};
  const unsupported = [];
  let index = 0;

  items.forEach(function (item) {
    const typeName = String(item.getType());
    if (SKIPPED_TYPES.indexOf(typeName) !== -1) return;

    if (SUPPORTED_TYPES.indexOf(typeName) === -1) {
      unsupported.push({ id: String(item.getId()), title: item.getTitle(), type: typeName });
      return;
    }

    const id = String(item.getId());
    const base = {
      id: id,
      index: null,
      type: typeName,
      title: item.getTitle(),
      helpText: item.getHelpText() || '',
      required: false,
      choices: [],
      hasOtherOption: false,
      points: 0,
      autoGraded: false,
      maxLength: null,
    };

    if (typeName === 'SECTION_HEADER') {
      questions.push(base);
      byId[id] = { item: item, type: typeName, required: false, choices: [], correct: [], points: 0, autoGraded: false, maxLength: null, hasOtherOption: false };
      return;
    }

    index += 1;
    base.index = index;

    let typed;
    let correct = [];

    if (typeName === 'MULTIPLE_CHOICE') {
      typed = item.asMultipleChoiceItem();
      base.hasOtherOption = typed.hasOtherOption();
    } else if (typeName === 'LIST') {
      typed = item.asListItem();
    } else if (typeName === 'CHECKBOX') {
      typed = item.asCheckboxItem();
      base.hasOtherOption = typed.hasOtherOption();
    } else if (typeName === 'TEXT') {
      typed = item.asTextItem();
      base.maxLength = LIMITS.TEXT_MAX;
    } else {
      typed = item.asParagraphTextItem();
      base.maxLength = LIMITS.PARAGRAPH_MAX;
    }

    base.required = typed.isRequired();
    base.points = safePoints(typed);

    if (CHOICE_TYPES.indexOf(typeName) !== -1) {
      const choiceObjs = typed.getChoices();
      base.choices = choiceObjs.map(function (c) {
        return c.getValue();
      });
      correct = choiceObjs
        .filter(function (c) {
          return isQuiz && safeIsCorrect(c);
        })
        .map(function (c) {
          return c.getValue();
        });
      base.autoGraded = isQuiz && base.points > 0 && correct.length > 0;
    }

    questions.push(base);
    byId[id] = {
      item: typed,
      type: typeName,
      required: base.required,
      choices: base.choices,
      correct: correct,
      points: base.points,
      autoGraded: base.autoGraded,
      maxLength: base.maxLength,
      hasOtherOption: base.hasOtherOption,
    };
  });

  if (unsupported.length > 0) {
    throw apiError(
      'UNSUPPORTED_QUESTION_TYPE',
      'Formulir berisi tipe pertanyaan yang belum didukung sistem kuis kustom.',
      unsupported
    );
  }

  const scoring = computeScoringSummary(questions, isQuiz);

  const publicModel = {
    quiz: quizKey,
    label: cfg.label,
    title: form.getTitle(),
    description: form.getDescription() || '',
    isQuiz: isQuiz,
    acceptingResponses: form.isAcceptingResponses(),
    scoring: scoring,
    questions: questions,
  };

  return { publicModel: publicModel, byId: byId, scoring: scoring, isQuiz: isQuiz };
}

/**
 * Ringkasan penilaian sesuai kontrak.
 * @param {Object[]} questions
 * @param {boolean} isQuiz
 */
function computeScoringSummary(questions, isQuiz) {
  let autoGradedCount = 0;
  let manualReviewCount = 0;
  let maxScore = 0;

  questions.forEach(function (q) {
    if (q.autoGraded) {
      autoGradedCount += 1;
      maxScore += q.points;
    } else if (TEXT_TYPES.indexOf(q.type) !== -1 && q.points > 0) {
      manualReviewCount += 1;
    }
  });

  let reason = null;
  if (!isQuiz) {
    reason = 'Formulir belum diatur sebagai kuis di Google Forms, sehingga skor otomatis tidak tersedia.';
  } else if (autoGradedCount === 0) {
    reason = 'Kunci jawaban atau bobot poin belum dikonfigurasi pada soal objektif.';
  }

  return {
    available: isQuiz && autoGradedCount > 0,
    autoGradedCount: autoGradedCount,
    manualReviewCount: manualReviewCount,
    maxScore: maxScore,
    reason: reason,
  };
}

/** getPoints() melempar error pada formulir non-kuis di beberapa kasus; amankan. */
function safePoints(typedItem) {
  try {
    const p = typedItem.getPoints();
    return typeof p === 'number' && isFinite(p) && p > 0 ? p : 0;
  } catch (err) {
    return 0;
  }
}

/** isCorrectAnswer() hanya bermakna pada mode kuis; amankan. */
function safeIsCorrect(choice) {
  try {
    return choice.isCorrectAnswer() === true;
  } catch (err) {
    return false;
  }
}
