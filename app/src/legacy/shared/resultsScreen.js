/**
 * Shared results-screen logic (reference parity).
 * Single source of truth: showResults flow, score text, Continue/Done behavior, visibility toggles.
 * Quizzes pass containerEl and config; correct/total and localStorage stay in each quiz.
 */

const defaultGetScoreText = ({ correct, total }) =>
  `You got ${correct} out of ${total} correct.`;

/**
 * @param {Element} containerEl - Quiz root element
 * @param {Object} config
 * @param {string} config.skillName - e.g. "Listen and Type"
 * @param {number} config.stagesTotal - e.g. 6
 * @param {function({ correct: number, total: number }): string} [config.getScoreText] - default: "You got X out of Y correct."
 * @param {function(string): string|null} config.getNextQuizUrl
 * @param {function(string): void} config.navigate
 * @param {function(): { stagesCompletedThisSession: number }} config.getState - for Continue click
 * @param {function(): boolean|void} config.onSelectNextStage - reset quiz and show next stage; return false if no more questions (helper then keeps results visible, does not show questionCard)
 * @param {function(): void} config.onDone - e.g. increment progress, then navigate home
 * @param {Object} [config.selectors] - ids/classes for results DOM
 * @param {string} [config.selectors.resultsScreen='resultsScreen']
 * @param {string} [config.selectors.resultsScore='resultsScore']
 * @param {string} [config.selectors.resultsContinueBtn='resultsContinueBtn']
 * @param {string} [config.selectors.doneBtn='.done-btn']
 * @param {string} [config.selectors.questionCard='questionCard']
 * @param {string} [config.selectors.questionCardDisplay='block'] - display value when showing question card again
 * @param {string[]} [config.selectors.hideWhenResults=['feedbackSection']] - ids to hide when showing results
 * @returns {{ showResults: function({ correct: number, total: number, stagesCompletedThisSession: number }), unbind: function[] }}
 */
export function initResultsScreen(containerEl, config) {
  if (!containerEl) return { showResults: () => {}, unbind: [] };

  const getEl = (root, idOrSelector) => {
    if (idOrSelector.startsWith(".") || idOrSelector.startsWith("#")) {
      return root.querySelector(idOrSelector) || document.querySelector(idOrSelector);
    }
    return root.querySelector('[id="' + idOrSelector + '"]') || document.getElementById(idOrSelector);
  };

  const sel = {
    resultsScreen: config.selectors?.resultsScreen ?? "resultsScreen",
    resultsScore: config.selectors?.resultsScore ?? "resultsScore",
    resultsContinueBtn: config.selectors?.resultsContinueBtn ?? "resultsContinueBtn",
    doneBtn: config.selectors?.doneBtn ?? ".done-btn",
    questionCard: config.selectors?.questionCard ?? "questionCard",
    questionCardDisplay: config.selectors?.questionCardDisplay ?? "block",
    hideWhenResults: config.selectors?.hideWhenResults ?? ["feedbackSection"],
  };

  const getScoreText = config.getScoreText || defaultGetScoreText;
  const skillName = config.skillName;
  const stagesTotal = config.stagesTotal;
  const getNextQuizUrl = config.getNextQuizUrl;
  const navigate = config.navigate;
  const getState = config.getState;
  const onSelectNextStage = config.onSelectNextStage;
  const onDone = config.onDone;
  const unbind = [];

  function showResults(state) {
    const { correct, total, stagesCompletedThisSession } = state;

    sel.hideWhenResults.forEach((id) => {
      const el = getEl(containerEl, id);
      if (el) el.style.display = "none";
    });
    const qCard = getEl(containerEl, sel.questionCard);
    if (qCard) qCard.style.display = "none";

    const resultsScoreEl = getEl(containerEl, sel.resultsScore);
    if (resultsScoreEl) resultsScoreEl.textContent = getScoreText({ correct, total });

    const continueBtn = getEl(containerEl, sel.resultsContinueBtn);
    if (continueBtn) {
      const hasMoreStages = stagesCompletedThisSession < stagesTotal;
      const hasNextQuiz = getNextQuizUrl && getNextQuizUrl(skillName);
      const showContinue = hasMoreStages || hasNextQuiz;
      continueBtn.style.display = showContinue ? "inline-block" : "none";
      continueBtn.disabled = !showContinue;
      continueBtn.style.cursor = showContinue ? "pointer" : "";
      continueBtn.style.pointerEvents = showContinue ? "auto" : "";
      continueBtn.style.opacity = showContinue ? "1" : "";
    }

    const resultsScreenEl = getEl(containerEl, sel.resultsScreen);
    if (resultsScreenEl) resultsScreenEl.style.display = "block";
  }

  function onContinueClick() {
    const state = getState();
    const stagesCompletedThisSession = state.stagesCompletedThisSession ?? 0;

    if (stagesCompletedThisSession >= stagesTotal && getNextQuizUrl) {
      const nextUrl = getNextQuizUrl(skillName);
      if (nextUrl) {
        navigate(nextUrl);
        return;
      }
    }

    let shouldShowQuiz = true;
    if (typeof onSelectNextStage === "function") {
      const result = onSelectNextStage();
      if (result === false) shouldShowQuiz = false;
    }
    if (shouldShowQuiz) {
      const resultsScreenEl = getEl(containerEl, sel.resultsScreen);
      if (resultsScreenEl) resultsScreenEl.style.display = "none";
      const qCard = getEl(containerEl, sel.questionCard);
      if (qCard) qCard.style.display = sel.questionCardDisplay;
    }
  }

  function onDoneClick() {
    if (typeof onDone === "function") onDone();
  }

  const resultsContBtn = getEl(containerEl, sel.resultsContinueBtn);
  if (resultsContBtn) {
    resultsContBtn.addEventListener("click", onContinueClick);
    unbind.push(() => resultsContBtn.removeEventListener("click", onContinueClick));
  }
  const doneBtnEl = getEl(containerEl, sel.doneBtn);
  if (doneBtnEl) {
    doneBtnEl.addEventListener("click", onDoneClick);
    unbind.push(() => doneBtnEl.removeEventListener("click", onDoneClick));
  }

  return { showResults, unbind };
}
