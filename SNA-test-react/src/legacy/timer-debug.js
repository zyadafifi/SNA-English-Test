/**
 * Shared timer registry - clears orphaned intervals from previous mounts (e.g. React Strict Mode).
 */
const _lastIntervalByQuiz = {};

/** Clear any interval from a previous init. Call at start of startQuestionTimer. */
export function clearOrphanedInterval(quizName) {
  const existing = _lastIntervalByQuiz[quizName];
  if (existing) {
    clearInterval(existing);
    _lastIntervalByQuiz[quizName] = null;
  }
}

/** Register the current interval so it can be cleared by a future init. */
export function registerInterval(quizName, intervalId) {
  _lastIntervalByQuiz[quizName] = intervalId;
}

/** Unregister when stopped. */
export function unregisterInterval(quizName) {
  _lastIntervalByQuiz[quizName] = null;
}
