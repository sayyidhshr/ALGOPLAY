/**
 * ALGOPLAY Quiz Backend — Penilaian otomatis.
 *
 * Murni (tanpa FormApp). Dinilai HANYA soal autoGraded:
 *  - MULTIPLE_CHOICE / LIST : benar jika jawaban termasuk salah satu kunci.
 *  - CHECKBOX               : benar jika himpunan pilihan TEPAT sama dengan kunci
 *                             (all-or-nothing, mengikuti perilaku bawaan Google Forms).
 *  - TEXT / PARAGRAPH_TEXT  : tidak dinilai otomatis (manual review).
 */

/**
 * @param {{byId: Object<string, Object>, scoring: Object}} model
 * @param {Object<string, string|string[]>} normalizedAnswers hasil validateSubmission().normalized
 * @return {Object} result sesuai kontrak
 */
function computeResult(model, normalizedAnswers) {
  const byId = model.byId;
  const scoring = model.scoring;

  let totalQuestions = 0;
  Object.keys(byId).forEach(function (qid) {
    if (byId[qid].type !== 'SECTION_HEADER') totalQuestions += 1;
  });

  if (!scoring.available) {
    return {
      available: false,
      score: null,
      maxScore: null,
      percentage: null,
      autoGradedCount: scoring.autoGradedCount,
      correctCount: null,
      manualReviewCount: scoring.manualReviewCount,
      totalQuestions: totalQuestions,
      reason: scoring.reason,
    };
  }

  let score = 0;
  let correctCount = 0;

  Object.keys(byId).forEach(function (qid) {
    const meta = byId[qid];
    if (!meta.autoGraded) return;
    const answer = normalizedAnswers[qid];
    if (answer === undefined) return;
    if (isAnswerCorrect(meta, answer)) {
      score += meta.points;
      correctCount += 1;
    }
  });

  const maxScore = scoring.maxScore;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  return {
    available: true,
    score: score,
    maxScore: maxScore,
    percentage: percentage,
    autoGradedCount: scoring.autoGradedCount,
    correctCount: correctCount,
    manualReviewCount: scoring.manualReviewCount,
    totalQuestions: totalQuestions,
    reason: null,
  };
}

/**
 * @param {Object} meta entri byId
 * @param {string|string[]} answer
 * @return {boolean}
 */
function isAnswerCorrect(meta, answer) {
  if (meta.type === 'CHECKBOX') {
    if (!Array.isArray(answer)) return false;
    const a = answer.slice().sort();
    const k = meta.correct.slice().sort();
    if (a.length !== k.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== k[i]) return false;
    }
    return true;
  }
  return typeof answer === 'string' && meta.correct.indexOf(answer) !== -1;
}
