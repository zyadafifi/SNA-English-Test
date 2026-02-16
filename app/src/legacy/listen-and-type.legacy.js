import { getNextQuizUrl } from "./skills-config.legacy.js";
import { getQuizDataUrl } from "./quiz-data-url.js";
import { initResultsScreen } from "./shared/resultsScreen.js";

import * as timerDbg from "./timer-debug.js";

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) =>
    root.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const getNextQuizUrlFn = options.getNextQuizUrl || getNextQuizUrl;
  const unbind = [];

  // Quiz Data (will be loaded from JSON)
  let allQuizData = [];
  let quizData = [];
  let quizConfig = {};

  // Quiz State
  let currentQuestion = 0;
  let score = 0;
  let answers = [];
  let questionStartTime = 0;
  let timerInterval;
  let dataLoaded = false;
  let timeoutInterval;
  let stagesCompletedThisSession = 0;
  let cumulativeCorrect = 0;
  let cumulativeTotal = 0;
  let feedbackAutoAdvanceTimeout = null;
  let speechSynthesis = window.speechSynthesis;
  let playbackSpeed = 1.0;
  let tooltipShown = false;

  // Configuration
  const QUESTIONS_PER_QUIZ = 15;
  const STAGES_TOTAL = 6;
  const USED_QUESTIONS_KEY = "listen_type_used_questions";
  const QUESTION_TIMEOUT = 60000; // 1 minute in milliseconds

  // Load Quiz Data from JSON
  async function loadQuizData() {
    try {
      showLoadingScreen();

      const response = await fetch(getQuizDataUrl("listen and type data.json"));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (
        !data.questions ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error(
          "Invalid data format: questions array is missing or empty",
        );
      }

      allQuizData = data.questions;
      quizConfig = data.config || {};

      // Select random questions avoiding previously used ones
      quizData = selectRandomQuestions(allQuizData, QUESTIONS_PER_QUIZ);

      if (quizData.length === 0) {
        throw new Error(
          "No new questions available. All questions have been used.",
        );
      }

      dataLoaded = true;
      hideLoadingScreen();
      initializeQuiz();
    } catch (error) {
      console.error("Error loading quiz data:", error);
      showErrorScreen(error.message);
    }
  }

  // Select random questions avoiding previously used ones
  function selectRandomQuestions(allQuestions, count) {
    const usedQuestions = getUsedQuestions();
    const availableQuestions = allQuestions.filter(
      (question) => !usedQuestions.includes(question.id.toString()),
    );

    if (availableQuestions.length === 0) {
      console.log("All questions have been used. Resetting question pool.");
      clearUsedQuestions();
      return selectRandomQuestions(allQuestions, count);
    }

    if (availableQuestions.length <= count) {
      console.log(
        `Only ${availableQuestions.length} questions available. Using all.`,
      );
      const selectedIds = availableQuestions.map((q) => q.id.toString());
      saveUsedQuestions([...usedQuestions, ...selectedIds]);
      return [...availableQuestions];
    }

    // Randomly select questions
    const shuffled = [...availableQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedQuestions = shuffled.slice(0, count);
    const selectedIds = selectedQuestions.map((q) => q.id.toString());
    saveUsedQuestions([...usedQuestions, ...selectedIds]);

    return selectedQuestions;
  }

  // LocalStorage functions
  function getUsedQuestions() {
    try {
      const stored = localStorage.getItem(USED_QUESTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading used questions:", error);
      return [];
    }
  }

  function saveUsedQuestions(questions) {
    try {
      localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(questions));
    } catch (error) {
      console.error("Error saving used questions:", error);
    }
  }

  function clearUsedQuestions() {
    try {
      localStorage.removeItem(USED_QUESTIONS_KEY);
    } catch (error) {
      console.error("Error clearing used questions:", error);
    }
  }

  // Show/Hide Loading Screen
  function showLoadingScreen() {
    getEl(containerEl, "loadingScreen").style.display = "flex";
    getEl(containerEl, "quizContainer").style.display = "none";
  }

  function hideLoadingScreen() {
    getEl(containerEl, "loadingScreen").style.display = "none";
    getEl(containerEl, "quizContainer").style.display = "flex";
  }

  function showErrorScreen(errorMessage) {
    console.error("Quiz load error:", errorMessage);
    getEl(containerEl, "loadingScreen").style.display = "none";
    goBack();
  }

  // Initialize Quiz
  function initializeQuiz() {
    if (!dataLoaded || quizData.length === 0) {
      showErrorScreen("No quiz data available");
      return;
    }

    currentQuestion = 0;
    score = 0;
    answers = [];

    console.log(`Starting quiz with ${quizData.length} questions`);
    showQuestion();
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Show Current Question
  // Update Progress Bar
  function updateProgressBar() {
    const progressFill = getEl(containerEl, "stageProgressFill");
    const progressText = getEl(containerEl, "stageProgressText");
    if (!progressFill || !progressText) return;

    let completed, total, percentage;
    if (stagesCompletedThisSession === 0) {
      completed = currentQuestion;
      total = quizData.length;
    } else {
      total = STAGES_TOTAL * QUESTIONS_PER_QUIZ;
      completed =
        stagesCompletedThisSession * QUESTIONS_PER_QUIZ + currentQuestion;
    }
    percentage = total > 0 ? (completed / total) * 100 : 0;
    progressFill.style.width = percentage + "%";
    progressText.textContent = completed + "/" + total;
  }

  function showQuestion() {
    if (currentQuestion >= quizData.length) {
      showResults();
      return;
    }

    const question = quizData[currentQuestion];

    // Update progress bar
    updateProgressBar();

    // Reset UI
    const textInput = getEl(containerEl, "textInput");
    const submitBtn = getEl(containerEl, "submitBtn");
    const playButton = getEl(containerEl, "playButton");
    const audioStatus = getEl(containerEl, "audioStatus");

    textInput.value = "";
    textInput.className = "text-input";
    textInput.disabled = false;

    submitBtn.className = "submit-btn";
    submitBtn.textContent = "SUBMIT";
    submitBtn.style.display = "block"; // Make sure it's visible again

    playButton.className = "play-button";

    // Reset tooltip for each new question (show only on first question of quiz)
    if (currentQuestion === 0 && !tooltipShown) {
      const tooltip = getEl(containerEl, "audioTooltip");
      tooltip.classList.add("show");
    } else {
      // Hide tooltip for subsequent questions
      const tooltip = getEl(containerEl, "audioTooltip");
      tooltip.classList.remove("show");
    }

    // Hide audio status
    audioStatus.style.display = "none";

    // Add input listener
    textInput.addEventListener("input", checkInputFilled);

    // Hide feedback
    getEl(containerEl, "feedbackSection").style.display = "none";

    // Start question timer and timeout
    startQuestionTimer();
    startQuestionTimeout();
  }

  function playAudio() {
    const question = quizData[currentQuestion];
    const playButton = getEl(containerEl, "playButton");
    const audioStatus = getEl(containerEl, "audioStatus");

    // Check if speech synthesis is supported
    if (!speechSynthesis) {
      showAudioStatus(
        "Text-to-speech is not supported in your browser",
        "error",
      );
      return;
    }

    // If already playing, pause it
    if (playButton.classList.contains("playing")) {
      speechSynthesis.cancel();
      playButton.classList.remove("playing");
      stopWaveformAnimation();
      return;
    }

    // Immediately update button and waveform state (before audio starts)
    playButton.classList.add("playing");
    animateWaveform();

    // Hide tooltip after first play
    if (!tooltipShown) {
      const tooltip = getEl(containerEl, "audioTooltip");
      tooltip.classList.remove("show");
      tooltipShown = true;
    }

    try {
      // Stop any current speech
      speechSynthesis.cancel();

      // Use correctText for speech synthesis
      const textToSpeak = question.correctText;

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Configure speech
      utterance.rate = 0.9 * playbackSpeed; // Use playback speed
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Try to use an English voice
      const voices = speechSynthesis.getVoices();
      const englishVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("en") && !voice.name.includes("Google"),
        ) || voices.find((voice) => voice.lang.startsWith("en"));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // Event handlers
      utterance.onstart = function () {
        // Button and waveform already updated, just ensure they stay active
      };

      utterance.onend = function () {
        playButton.classList.remove("playing");
        hideAudioStatus();
        stopWaveformAnimation();
      };

      utterance.onerror = function (event) {
        playButton.classList.remove("playing");
        showAudioStatus("Error playing audio: " + event.error, "error");
        console.error("Speech synthesis error:", event);
      };

      // Speak the text
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      showAudioStatus("Error playing audio", "error");
      playButton.classList.remove("playing");
    }
  }

  function showAudioStatus(message, type) {
    const audioStatus = getEl(containerEl, "audioStatus");
    // Only show error messages, hide success messages
    if (type === "error") {
      audioStatus.textContent = message;
      audioStatus.className = `audio-status ${type}`;
      audioStatus.style.display = "block";
    }
  }

  function hideAudioStatus() {
    const audioStatus = getEl(containerEl, "audioStatus");
    audioStatus.style.display = "none";
  }

  // Toggle playback speed
  function toggleSpeed() {
    const speedControl = getEl(containerEl, "speedControl");
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    playbackSpeed = speeds[nextIndex];
    speedControl.textContent = playbackSpeed + "x";
  }

  // Animate waveform
  function animateWaveform() {
    const bars = containerEl.querySelectorAll(".waveform-bar");
    bars.forEach((bar, index) => {
      // Immediately start animation without delay
      bar.style.animation = `waveformPulse ${
        0.3 + Math.random() * 0.2
      }s ease-in-out infinite`;
      bar.style.animationDelay = `${index * 0.02}s`;
    });
  }

  function stopWaveformAnimation() {
    const bars = containerEl.querySelectorAll(".waveform-bar");
    bars.forEach((bar) => {
      bar.style.animation = "none";
    });
  }

  // Add waveform animation keyframes (only add once)
  if (!getEl(containerEl, "waveform-animation-style")) {
    const style = document.createElement("style");
    style.id = "waveform-animation-style";
    style.textContent = `
          @keyframes waveformPulse {
            0%, 100% {
              transform: scaleY(0.5);
            }
            50% {
              transform: scaleY(1.6);
            }
          }
        `;
    document.head.appendChild(style);
  }

  function checkInputFilled() {
    const textInput = getEl(containerEl, "textInput");
    const submitBtn = getEl(containerEl, "submitBtn");

    if (textInput.value.trim().length > 0) {
      submitBtn.className = "submit-btn active";
    } else {
      submitBtn.className = "submit-btn";
    }
  }

  function startQuestionTimer() {
    timerDbg.clearOrphanedInterval("ListenAndType");
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    questionStartTime = Date.now();
    let seconds = 0;
    const timerElement = getEl(containerEl, "timer");
    const timerText = getEl(containerEl, "timerText");
    if (timerText) timerText.textContent = "0:00";

    timerInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (timerText)
        timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
      if (seconds >= 45 && timerElement) timerElement.classList.add("warning");
    }, 1000);
    timerDbg.registerInterval("ListenAndType", timerInterval);
  }

  function startQuestionTimeout() {
    timeoutInterval = setTimeout(() => {
      // Auto-submit as incorrect if no answer after 1 minute
      console.log("Question timed out");
      submitAnswer(true); // true indicates timeout
    }, QUESTION_TIMEOUT);
  }

  function stopQuestionTimer() {
    if (timerInterval) {
      timerDbg.unregisterInterval("ListenAndType");
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timeoutInterval) {
      clearTimeout(timeoutInterval);
      timeoutInterval = null;
    }
    const timerEl = getEl(containerEl, "timer");
    if (timerEl) timerEl.classList.remove("warning");
  }

  function submitAnswer(isTimeout = false) {
    const submitBtn = getEl(containerEl, "submitBtn");
    const textInput = getEl(containerEl, "textInput");

    // Don't allow double submission
    if (submitBtn.classList.contains("submitted")) {
      return;
    }

    // If timeout and no input, don't allow submission with empty button
    if (isTimeout && !submitBtn.classList.contains("active")) {
      // Force submission as incorrect
    } else if (!isTimeout && !submitBtn.classList.contains("active")) {
      return;
    }

    stopQuestionTimer();

    const question = quizData[currentQuestion];
    const userAnswer = textInput.value.trim();
    const correctAnswer = question.correctText;

    // Check if answer is correct (case-insensitive, allow minor variations)
    const isCorrect =
      !isTimeout && checkAnswerCorrectness(userAnswer, correctAnswer);

    // Store answer
    const timeSpent = Date.now() - questionStartTime;
    answers.push({
      question: question.id,
      userAnswer: userAnswer,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect,
      isTimeout: isTimeout,
      timeSpent: timeSpent,
    });

    if (isCorrect) {
      score++;
    }

    // Update UI
    textInput.disabled = true;
    textInput.classList.add("submitted");

    if (isCorrect) {
      textInput.classList.add("correct");
    } else {
      textInput.classList.add("incorrect");
    }

    // Remove submit button completely
    submitBtn.style.display = "none";

    // Show feedback
    showFeedback(isCorrect, correctAnswer, isTimeout);
  }

  function checkAnswerCorrectness(userAnswer, correctAnswer) {
    // Normalize both answers for comparison
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[.,!?;:"']/g, "") // Remove punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    };

    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);

    // Exact match
    if (normalizedUser === normalizedCorrect) {
      return true;
    }

    // Calculate similarity (allow up to 10% character differences)
    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.9;
  }

  function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function getEditDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  function showFeedback(isCorrect, correctAnswer, isTimeout) {
    clearTimeout(feedbackAutoAdvanceTimeout);
    const feedbackSection = getEl(containerEl, "feedbackSection");
    const feedbackTitle = getEl(containerEl, "feedbackTitle");
    const feedbackIcon = getEl(containerEl, "feedbackIcon");
    const correctAnswerText = getEl(containerEl, "correctAnswerText");

    feedbackSection.style.display = "block";

    if (isCorrect) {
      // Play correct answer sound
      playSound("right answer SFX.wav");
      feedbackSection.className = "feedback-section correct";
      feedbackTitle.className = "feedback-title correct";
      feedbackTitle.textContent = "Correct!";
      correctAnswerText.className = "correct-answer-text correct-feedback";
      correctAnswerText.textContent = "Well done!";
      feedbackIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <polyline points="16,8 10,14 8,12"/>
          `;
    } else {
      // Play wrong answer sound
      playSound("wrong answer SFX.wav");
      feedbackSection.className = "feedback-section incorrect";
      feedbackTitle.className = "feedback-title incorrect";
      feedbackTitle.textContent = isTimeout ? "Time's up!" : "Incorrect";
      correctAnswerText.className = "correct-answer-text";
      correctAnswerText.innerHTML = `<strong>Correct Answer:</strong><br>${correctAnswer}`;
      feedbackIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          `;
    }
    feedbackAutoAdvanceTimeout = setTimeout(nextQuestion, 2000);
  }

  function playSound(filename) {
    try {
      const audio = new Audio(filename);
      audio.volume = 0.5;
      audio.play().catch((error) => {
        console.log("Could not play sound:", error);
      });
    } catch (error) {
      console.log("Error creating audio:", error);
    }
  }

  function nextQuestion() {
    clearTimeout(feedbackAutoAdvanceTimeout);
    currentQuestion++;

    if (currentQuestion < quizData.length) {
      showQuestion();
    } else {
      showResults();
    }
  }

  const resultsHelper = initResultsScreen(containerEl, {
    skillName: "Listen and Type",
    stagesTotal: STAGES_TOTAL,
    getScoreText: ({ correct, total }) =>
      `You got ${correct} out of ${total} correct.`,
    getNextQuizUrl: getNextQuizUrlFn,
    navigate: (url) =>
      typeof options.navigate === "function"
        ? options.navigate(url)
        : (window.location.href = url),
    getState: () => ({ stagesCompletedThisSession }),
    onSelectNextStage() {
      if (allQuizData.length > 0) {
        quizData = selectRandomQuestions(allQuizData, QUESTIONS_PER_QUIZ);
        if (quizData.length === 0) {
          const continueBtn = getEl(containerEl, "resultsContinueBtn");
          if (continueBtn) continueBtn.style.display = "none";
          return false;
        }
      }
      currentQuestion = 0;
      score = 0;
      answers = [];
      initializeQuiz();
    },
    onDone() {
      incrementSkillProgress("Listen and Type", stagesCompletedThisSession);
      if (typeof options.navigate === "function") options.navigate("/");
      else window.location.href = "index.html";
    },
    selectors: {
      resultsScreen: "resultsScreen",
      resultsScore: "resultsScore",
      resultsContinueBtn: "resultsContinueBtn",
      doneBtn: ".done-btn",
      questionCard: "questionCard",
      questionCardDisplay: "flex",
      hideWhenResults: ["feedbackSection"],
    },
  });
  if (resultsHelper.unbind && resultsHelper.unbind.length)
    unbind.push(...resultsHelper.unbind);

  function showResults() {
    stagesCompletedThisSession++;
    cumulativeCorrect += score;
    cumulativeTotal += quizData.length;
    saveDetailedQuizResult("Listen and Type");
    resultsHelper.showResults({
      correct: cumulativeCorrect,
      total: cumulativeTotal,
      stagesCompletedThisSession,
    });
  }
  // Function to save detailed quiz result
  function saveDetailedQuizResult(skillName) {
    const sessionData = calculateSessionMetrics();

    // Create session result object
    const sessionResult = {
      skillName: skillName,
      sessionId: Date.now(),
      date: new Date().toISOString(),

      // Basic performance data
      totalQuestions: quizData.length,
      correctAnswers: score,
      accuracy: (score / quizData.length) * 100,

      // Time analysis
      totalTimeSpent: sessionData.totalTime,
      averageTimePerQuestion: sessionData.avgTime,

      // Performance analysis for listening
      consistency: sessionData.consistency,
      difficultyHandling: sessionData.difficultyScore,
      listeningAccuracy: sessionData.listeningAccuracy,
      typingSpeed: sessionData.typingSpeed,
      errorTypes: sessionData.errorTypes,

      // Final session score
      sessionScore: calculateSessionScore(sessionData),

      // Individual question details
      questionDetails: answers.map((answer, index) => ({
        questionId: answer.question,
        questionType: "listen_and_type",
        difficulty: determineDifficulty(quizData[index]),
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
        similarity: calculateSimilarity(
          normalizeText(answer.userAnswer),
          normalizeText(answer.correctAnswer),
        ),
        errorType: analyzeErrorType(answer.userAnswer, answer.correctAnswer),
        isTimeout: answer.isTimeout || false,
      })),
    };

    // Save result to localStorage
    saveSessionToHistory(skillName, sessionResult);
    console.log(`Session saved for ${skillName}:`, sessionResult);
  }

  // Calculate session metrics
  function calculateSessionMetrics() {
    const totalTime = answers.reduce(
      (sum, answer) => sum + answer.timeSpent,
      0,
    );
    const avgTime = totalTime / answers.length;

    // Calculate consistency - how stable user performance is
    const timeDeviations = answers.map((answer) =>
      Math.abs(answer.timeSpent - avgTime),
    );
    const avgDeviation =
      timeDeviations.reduce((sum, dev) => sum + dev, 0) / timeDeviations.length;
    const consistency = Math.max(0, 100 - (avgDeviation / avgTime) * 100);

    // Calculate difficulty handling score
    const difficultyScore = calculateDifficultyHandling();

    // Calculate listening accuracy (different from overall accuracy)
    const listeningAccuracy = calculateListeningAccuracy();

    // Calculate typing speed (characters per minute)
    const typingSpeed = calculateTypingSpeed();

    // Analyze error types
    const errorTypes = analyzeErrorTypes();

    return {
      totalTime: Math.round(totalTime / 1000), // Convert to seconds
      avgTime: Math.round(avgTime / 1000), // Convert to seconds
      consistency: Math.round(consistency),
      difficultyScore: difficultyScore,
      listeningAccuracy: listeningAccuracy,
      typingSpeed: typingSpeed,
      errorTypes: errorTypes,
    };
  }

  // Normalize text for comparison
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[.,!?;:"']/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  // Determine sentence difficulty based on characteristics
  function determineDifficulty(question) {
    let difficulty = 1; // Base difficulty (Easy)

    const text = question.correctText;
    const words = text.split(" ");
    const wordCount = words.length;

    // Length-based difficulty
    if (wordCount >= 8) {
      difficulty += 1; // Long sentences are harder
    } else if (wordCount >= 6) {
      difficulty += 0.5; // Medium sentences
    }

    // Complexity indicators
    const complexWords = words.filter((word) => word.length > 6);
    if (complexWords.length >= 2) {
      difficulty += 0.5;
    }

    // Grammar complexity
    const hasComplexGrammar =
      /\b(going to|there is|there are|at nine|very)\b/i.test(text);
    if (hasComplexGrammar) {
      difficulty += 0.3;
    }

    // Numbers and specific terms
    const hasNumbers = /\d+|nine|ten|eleven|twelve/i.test(text);
    const hasProperNouns = /[A-Z][a-z]+/g.test(text);
    if (hasNumbers || hasProperNouns) {
      difficulty += 0.2;
    }

    // Clamp difficulty between 1-3
    difficulty = Math.max(1, Math.min(3, difficulty));

    if (difficulty <= 1.5) return "easy";
    if (difficulty <= 2.5) return "medium";
    return "hard";
  }

  // Calculate how well user handles different difficulty levels
  function calculateDifficultyHandling() {
    const difficultyStats = {
      easy: { correct: 0, total: 0, totalSimilarity: 0 },
      medium: { correct: 0, total: 0, totalSimilarity: 0 },
      hard: { correct: 0, total: 0, totalSimilarity: 0 },
    };

    // Analyze performance by difficulty
    answers.forEach((answer, index) => {
      const difficulty = determineDifficulty(quizData[index]);
      difficultyStats[difficulty].total++;

      if (answer.isCorrect) {
        difficultyStats[difficulty].correct++;
      }

      // Calculate similarity even for incorrect answers
      const similarity = calculateSimilarity(
        normalizeText(answer.userAnswer),
        normalizeText(answer.correctAnswer),
      );
      difficultyStats[difficulty].totalSimilarity += similarity * 100;
    });

    // Calculate weighted score based on difficulty handling
    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
      if (stats.total > 0) {
        const accuracy = stats.correct / stats.total;
        const avgSimilarity = stats.totalSimilarity / stats.total;

        // Combine accuracy and similarity for a more nuanced score
        const combinedScore = accuracy * 70 + avgSimilarity * 0.3;

        const weight =
          difficulty === "easy" ? 1 : difficulty === "medium" ? 1.5 : 2;
        weightedScore += combinedScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  // Calculate listening accuracy (based on similarity scores)
  function calculateListeningAccuracy() {
    let totalSimilarity = 0;
    let validAnswers = 0;

    answers.forEach((answer) => {
      if (answer.userAnswer.trim().length > 0) {
        const similarity = calculateSimilarity(
          normalizeText(answer.userAnswer),
          normalizeText(answer.correctAnswer),
        );
        totalSimilarity += similarity * 100;
        validAnswers++;
      }
    });

    return validAnswers > 0 ? Math.round(totalSimilarity / validAnswers) : 0;
  }

  // Calculate typing speed (characters per minute)
  function calculateTypingSpeed() {
    let totalCharacters = 0;
    let totalTimeMinutes = 0;

    answers.forEach((answer) => {
      totalCharacters += answer.userAnswer.length;
      totalTimeMinutes += answer.timeSpent / 60000; // Convert to minutes
    });

    return totalTimeMinutes > 0
      ? Math.round(totalCharacters / totalTimeMinutes)
      : 0;
  }

  // Analyze types of errors made
  function analyzeErrorTypes() {
    const errorStats = {
      spelling: 0,
      grammar: 0,
      missing: 0,
      extra: 0,
      order: 0,
    };

    answers.forEach((answer) => {
      if (!answer.isCorrect && answer.userAnswer.trim().length > 0) {
        const errorType = analyzeErrorType(
          answer.userAnswer,
          answer.correctAnswer,
        );
        if (errorStats[errorType] !== undefined) {
          errorStats[errorType]++;
        }
      }
    });

    return errorStats;
  }

  // Analyze specific error type for a single answer
  function analyzeErrorType(userAnswer, correctAnswer) {
    const userWords = normalizeText(userAnswer)
      .split(" ")
      .filter((w) => w.length > 0);
    const correctWords = normalizeText(correctAnswer)
      .split(" ")
      .filter((w) => w.length > 0);

    // Missing words
    if (userWords.length < correctWords.length * 0.7) {
      return "missing";
    }

    // Extra words
    if (userWords.length > correctWords.length * 1.3) {
      return "extra";
    }

    // Check for word order issues
    const commonWords = userWords.filter((word) => correctWords.includes(word));
    if (commonWords.length >= correctWords.length * 0.7) {
      return "order";
    }

    // Check for grammar vs spelling
    const hasCommonWords = userWords.some((word) =>
      correctWords.includes(word),
    );
    if (hasCommonWords) {
      return "grammar";
    }

    return "spelling";
  }

  // Calculate final session score
  function calculateSessionScore(sessionData) {
    const accuracy = (score / quizData.length) * 100;

    // Scoring weights for listening tasks
    const weights = {
      accuracy: 0.4, // 40% - Most important
      listeningAccuracy: 0.25, // 25% - Understanding what was heard
      consistency: 0.15, // 15% - Performance stability
      difficulty: 0.1, // 10% - Handling hard sentences
      typingSpeed: 0.05, // 5% - Typing efficiency
      errorPattern: 0.05, // 5% - Types of errors made
    };

    // Typing speed score (optimal range: 30-60 CPM for careful listening)
    const optimalSpeed = 45;
    const speedDiff = Math.abs(sessionData.typingSpeed - optimalSpeed);
    const typingSpeedScore = Math.max(0, 100 - (speedDiff / optimalSpeed) * 50);

    // Error pattern score (fewer spelling errors is better)
    const totalErrors = Object.values(sessionData.errorTypes).reduce(
      (sum, count) => sum + count,
      0,
    );
    const errorPatternScore =
      totalErrors === 0
        ? 100
        : Math.max(0, 100 - (totalErrors / answers.length) * 100);

    // Calculate final weighted score
    const finalScore =
      accuracy * weights.accuracy +
      sessionData.listeningAccuracy * weights.listeningAccuracy +
      sessionData.consistency * weights.consistency +
      sessionData.difficultyScore * weights.difficulty +
      typingSpeedScore * weights.typingSpeed +
      errorPatternScore * weights.errorPattern;

    return Math.round(Math.max(0, Math.min(100, finalScore)));
  }

  // Save session to localStorage history
  function saveSessionToHistory(skillName, sessionResult) {
    const historyKey = `${skillName
      .replace(/\s+/g, "_")
      .toLowerCase()}_sessions`;

    try {
      // Get existing sessions
      const existingSessions = localStorage.getItem(historyKey);
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];

      // Add new session
      sessions.push(sessionResult);

      // Keep only last 20 sessions to prevent storage overflow
      if (sessions.length > 20) {
        sessions.splice(0, sessions.length - 20);
      }

      // Save back to localStorage
      localStorage.setItem(historyKey, JSON.stringify(sessions));

      console.log(
        `Saved session to ${historyKey}. Total sessions: ${sessions.length}`,
      );

      // Update overall skill assessment
      updateSkillOverallAssessment(skillName, sessions);
    } catch (error) {
      console.error("Error saving session to history:", error);
    }
  }

  // Update overall skill assessment based on all sessions
  function updateSkillOverallAssessment(skillName, allSessions) {
    if (!allSessions || allSessions.length === 0) return;

    // Calculate overall metrics
    const totalQuestions = allSessions.reduce(
      (sum, session) => sum + session.totalQuestions,
      0,
    );
    const totalCorrect = allSessions.reduce(
      (sum, session) => sum + session.correctAnswers,
      0,
    );
    const overallAccuracy = (totalCorrect / totalQuestions) * 100;

    // Calculate listening-specific metrics
    const avgListeningAccuracy =
      allSessions.reduce((sum, session) => sum + session.listeningAccuracy, 0) /
      allSessions.length;

    const avgTypingSpeed =
      allSessions.reduce((sum, session) => sum + session.typingSpeed, 0) /
      allSessions.length;

    // Calculate improvement (compare first vs last session)
    const firstSession = allSessions[0];
    const lastSession = allSessions[allSessions.length - 1];
    const improvement = lastSession.accuracy - firstSession.accuracy;

    // Calculate average session score
    const avgSessionScore =
      allSessions.reduce((sum, session) => sum + session.sessionScore, 0) /
      allSessions.length;

    // Calculate consistency across sessions
    const sessionScores = allSessions.map((s) => s.sessionScore);
    const scoreStdDev = calculateStandardDeviation(sessionScores);
    const crossSessionConsistency = Math.max(0, 100 - scoreStdDev);

    // Final skill score calculation
    const skillWeights = {
      overallAccuracy: 0.3,
      listeningAccuracy: 0.25,
      avgScore: 0.2,
      improvement: 0.15,
      consistency: 0.1,
    };

    const normalizedImprovement = Math.max(0, Math.min(100, improvement + 50)); // Normalize to 0-100

    const finalSkillScore =
      overallAccuracy * skillWeights.overallAccuracy +
      avgListeningAccuracy * skillWeights.listeningAccuracy +
      avgSessionScore * skillWeights.avgScore +
      normalizedImprovement * skillWeights.improvement +
      crossSessionConsistency * skillWeights.consistency;

    // Create overall assessment
    const skillAssessment = {
      skillName: skillName,
      lastUpdated: new Date().toISOString(),
      sessionsCompleted: allSessions.length,

      // Performance metrics
      overallAccuracy: Math.round(overallAccuracy),
      averageListeningAccuracy: Math.round(avgListeningAccuracy),
      averageTypingSpeed: Math.round(avgTypingSpeed),
      averageSessionScore: Math.round(avgSessionScore),
      improvement: Math.round(improvement),
      consistency: Math.round(crossSessionConsistency),

      // Listening-specific metrics
      averageTimePerQuestion: Math.round(
        allSessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          allSessions.length,
      ),
      commonErrorTypes: getCommonErrorTypes(allSessions),

      // Final score
      finalScore: Math.round(finalSkillScore),
      level: determineSkillLevel(finalSkillScore),

      // Additional insights
      strongPoints: identifyStrongPoints(allSessions),
      weakPoints: identifyWeakPoints(allSessions),
      recommendations: generateRecommendations(allSessions, finalSkillScore),
    };

    // Save overall assessment
    const assessmentKey = `${skillName
      .replace(/\s+/g, "_")
      .toLowerCase()}_assessment`;
    localStorage.setItem(assessmentKey, JSON.stringify(skillAssessment));

    console.log(
      `Updated overall assessment for ${skillName}:`,
      skillAssessment,
    );
  }

  // Get common error types across all sessions
  function getCommonErrorTypes(sessions) {
    const allErrors = {
      spelling: 0,
      grammar: 0,
      missing: 0,
      extra: 0,
      order: 0,
    };

    sessions.forEach((session) => {
      Object.keys(session.errorTypes).forEach((errorType) => {
        if (allErrors[errorType] !== undefined) {
          allErrors[errorType] += session.errorTypes[errorType];
        }
      });
    });

    // Find the most common error type
    const maxErrors = Math.max(...Object.values(allErrors));
    const mostCommonError = Object.keys(allErrors).find(
      (key) => allErrors[key] === maxErrors,
    );

    return {
      mostCommon: mostCommonError,
      breakdown: allErrors,
    };
  }

  // Helper function to calculate standard deviation
  function calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // Determine skill level based on final score
  function determineSkillLevel(score) {
    if (score >= 90) return "Advanced";
    if (score >= 75) return "Upper-Intermediate";
    if (score >= 60) return "Intermediate";
    if (score >= 45) return "Lower-Intermediate";
    if (score >= 30) return "Elementary";
    return "Beginner";
  }

  // Identify strong points from session data
  function identifyStrongPoints(sessions) {
    const strongPoints = [];

    // Check accuracy trend
    const recentSessions = sessions.slice(-3);
    const avgRecentAccuracy =
      recentSessions.reduce((sum, s) => sum + s.accuracy, 0) /
      recentSessions.length;
    if (avgRecentAccuracy >= 80) {
      strongPoints.push("High accuracy in recent sessions");
    }

    // Check listening accuracy
    const avgListeningAccuracy =
      sessions.reduce((sum, s) => sum + s.listeningAccuracy, 0) /
      sessions.length;
    if (avgListeningAccuracy >= 85) {
      strongPoints.push("Excellent listening comprehension");
    }

    // Check typing speed
    const avgTypingSpeed =
      sessions.reduce((sum, s) => sum + s.typingSpeed, 0) / sessions.length;
    if (avgTypingSpeed >= 40) {
      strongPoints.push("Good typing speed");
    }

    // Check consistency
    const consistencyScores = sessions.map((s) => s.consistency);
    const avgConsistency =
      consistencyScores.reduce((sum, c) => sum + c, 0) /
      consistencyScores.length;
    if (avgConsistency >= 75) {
      strongPoints.push("Consistent performance across sessions");
    }

    return strongPoints.length > 0
      ? strongPoints
      : ["Shows improvement potential"];
  }

  // Identify weak points from session data
  function identifyWeakPoints(sessions) {
    const weakPoints = [];

    // Check accuracy
    const recentSessions = sessions.slice(-3);
    const avgRecentAccuracy =
      recentSessions.reduce((sum, s) => sum + s.accuracy, 0) /
      recentSessions.length;
    if (avgRecentAccuracy < 60) {
      weakPoints.push("Accuracy needs improvement");
    }

    // Check listening vs typing accuracy gap
    const avgListeningAccuracy =
      sessions.reduce((sum, s) => sum + s.listeningAccuracy, 0) /
      sessions.length;
    const avgOverallAccuracy =
      sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
    if (avgListeningAccuracy - avgOverallAccuracy > 20) {
      weakPoints.push(
        "Focus on typing accuracy - you hear correctly but make typing errors",
      );
    }

    // Check common error types
    const commonErrors = getCommonErrorTypes(sessions);
    if (commonErrors.mostCommon === "spelling") {
      weakPoints.push("Work on spelling accuracy");
    } else if (commonErrors.mostCommon === "missing") {
      weakPoints.push("Try to catch all words - some may be missed");
    }

    // Check time management
    const avgTime =
      sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
      sessions.length;
    if (avgTime > 45) {
      weakPoints.push("Consider working on response speed");
    }

    return weakPoints.length > 0
      ? weakPoints
      : ["Keep practicing to maintain progress"];
  }

  // Generate personalized recommendations
  function generateRecommendations(sessions, finalScore) {
    const recommendations = [];

    if (finalScore < 50) {
      recommendations.push("Focus on basic listening comprehension");
      recommendations.push("Practice with shorter sentences first");
      recommendations.push("Take your time to listen carefully");
    } else if (finalScore < 70) {
      recommendations.push("Work on typing accuracy while listening");
      recommendations.push("Practice identifying individual words");
      recommendations.push("Focus on common grammar patterns");
    } else if (finalScore < 85) {
      recommendations.push("Challenge yourself with longer sentences");
      recommendations.push("Work on maintaining accuracy under time pressure");
      recommendations.push("Practice with different accents and speeds");
    } else {
      recommendations.push("Excellent work! Try advanced listening materials");
      recommendations.push("Practice with natural speech recordings");
      recommendations.push("Help others improve their listening skills");
    }

    // Error-specific recommendations
    const commonErrors = getCommonErrorTypes(sessions);
    if (commonErrors.mostCommon === "spelling") {
      recommendations.push("Focus on spelling practice for common words");
    } else if (commonErrors.mostCommon === "missing") {
      recommendations.push(
        "Practice listening for all words, including small ones",
      );
    } else if (commonErrors.mostCommon === "extra") {
      recommendations.push("Listen more carefully to avoid adding extra words");
    }

    return recommendations;
  }

  // Function to increment progress by 1
  function incrementSkillProgress(skillName, count = 1) {
    const currentProgress = getCurrentSkillProgress(skillName);
    const newCompleted = Math.min(currentProgress + count, 6);

    const progressData = {
      skill: skillName,
      completed: newCompleted, // Send the new total completed count
      total: 6,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem("listenTypeProgress", JSON.stringify(progressData));
    console.log(`Progress updated: ${skillName} - ${newCompleted}/6`);
  }

  // Function to get current skill progress from localStorage
  function getCurrentSkillProgress(skillName) {
    try {
      // Check if there's existing progress in the main app
      const mainProgressData = localStorage.getItem("skillProgress");
      if (mainProgressData) {
        const allProgress = JSON.parse(mainProgressData);
        if (allProgress[skillName]) {
          return allProgress[skillName].completed || 0;
        }
      }
      return 0; // Start from 0 if no progress found
    } catch (error) {
      console.error("Error reading current progress:", error);
      return 0;
    }
  }

  function goBack() {
    window
      .showConfirmDialog("Are you sure you want to exit the quiz?")
      .then(function (confirmed) {
        if (confirmed) {
          if (stagesCompletedThisSession > 0) {
            incrementSkillProgress(
              "Listen and Type",
              stagesCompletedThisSession,
            );
          }
          if (typeof options.navigate === "function") options.navigate("/");
          else window.location.href = "/";
        }
      });
  }

  // Keyboard Support
  const keydownHandler = function (event) {
    if (
      !dataLoaded ||
      getEl(containerEl, "quizContainer").style.display === "none"
    ) {
      return;
    }

    if (event.key === "Escape") {
      goBack();
    } else if (event.key === "Enter" && event.ctrlKey) {
      // Ctrl+Enter to submit
      const submitBtn = getEl(containerEl, "submitBtn");
      if (submitBtn.classList.contains("active")) {
        submitAnswer();
      }
    } else if (event.key === " " && event.ctrlKey) {
      // Ctrl+Space to play audio
      event.preventDefault();
      playAudio();
    }
  };
  document.addEventListener("keydown", keydownHandler);
  function ensureVoicesLoaded() {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) resolve(voices);
      else
        speechSynthesis.onvoiceschanged = () =>
          resolve(speechSynthesis.getVoices());
    });
  }
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function () {
      console.log("Voices loaded:", speechSynthesis.getVoices().length);
    };
  }
  const closeBtn = containerEl.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", goBack);
    unbind.push(() => closeBtn.removeEventListener("click", goBack));
  }
  const submitBtnEl = getEl(containerEl, "submitBtn");
  if (submitBtnEl) {
    const h = () => submitAnswer();
    submitBtnEl.addEventListener("click", h);
    unbind.push(() => submitBtnEl.removeEventListener("click", h));
  }
  const playBtnEl = getEl(containerEl, "playButton");
  if (playBtnEl) {
    playBtnEl.addEventListener("click", playAudio);
    unbind.push(() => playBtnEl.removeEventListener("click", playAudio));
  }
  const speedEl = getEl(containerEl, "speedControl");
  if (speedEl) {
    speedEl.addEventListener("click", toggleSpeed);
    unbind.push(() => speedEl.removeEventListener("click", toggleSpeed));
  }
  loadQuizData();
  return function cleanup() {
    document.removeEventListener("keydown", keydownHandler);
    unbind.forEach((f) => f());
    if (timerInterval) clearInterval(timerInterval);
    if (feedbackAutoAdvanceTimeout) clearTimeout(feedbackAutoAdvanceTimeout);
  };
}
