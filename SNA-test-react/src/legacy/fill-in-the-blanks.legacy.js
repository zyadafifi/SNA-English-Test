import { getNextQuizUrl } from './skills-config.legacy.js';
import { getQuizDataUrl } from './quiz-data-url.js';
import { initResultsScreen } from './shared/resultsScreen.js';

import * as timerDbg from "./timer-debug.js";

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);
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
      let currentInputs = [];
      let stagesCompletedThisSession = 0;
      let cumulativeCorrect = 0;
      let cumulativeTotal = 0;
      let feedbackAutoAdvanceTimeout = null;

      // Configuration
      const QUESTIONS_PER_QUIZ = 15;
      const STAGES_TOTAL = 6;
      const USED_QUESTIONS_KEY = "fill_blanks_used_questions";

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch(getQuizDataUrl("fill in the blanks data.json"));
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
              "Invalid data format: questions array is missing or empty"
            );
          }

          allQuizData = data.questions;
          quizConfig = data.config || {};

          // Select random questions avoiding previously used ones
          quizData = selectRandomQuestions(allQuizData, QUESTIONS_PER_QUIZ);

          if (quizData.length === 0) {
            throw new Error(
              "No new questions available. All questions have been used."
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
          (question) => !usedQuestions.includes(question.id.toString())
        );

        if (availableQuestions.length === 0) {
          console.log("All questions have been used. Resetting question pool.");
          clearUsedQuestions();
          return selectRandomQuestions(allQuestions, count);
        }

        if (availableQuestions.length <= count) {
          console.log(
            `Only ${availableQuestions.length} questions available. Using all.`
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
        getEl(containerEl, "errorScreen").style.display = "none";
        getEl(containerEl, "quizContainer").style.display = "none";
      }

      function hideLoadingScreen() {
        getEl(containerEl, "loadingScreen").style.display = "none";
        getEl(containerEl, "quizContainer").style.display = "flex";
      }

      function showErrorScreen(errorMessage) {
        getEl(containerEl, "loadingScreen").style.display = "none";
        getEl(containerEl, "quizContainer").style.display = "none";
        getEl(containerEl, "errorScreen").style.display = "block";
        getEl(containerEl, "errorMessage").textContent = errorMessage;
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

        if (quizConfig.title) {
          getEl(containerEl, "questionTitle").textContent =
            quizConfig.title;
        }

        if (quizConfig.shuffleQuestions) {
          shuffleArray(quizData);
        }

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
          completed = stagesCompletedThisSession * QUESTIONS_PER_QUIZ + currentQuestion;
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
        createSentenceWithBlank(question.sentence);

        // Reset continue button
        const continueBtn = getEl(containerEl, "continueBtn");
        continueBtn.className = "continue-btn";
        continueBtn.textContent = "CONTINUE";
        continueBtn.style.display = "block";
        // Hide feedback
        getEl(containerEl, "feedbackSection").style.display = "none";

        // Update progress bar
        updateProgressBar();

        // Start question timer
        startQuestionTimer();
      }

      function createSentenceWithBlank(sentence) {
        const container = getEl(containerEl, "sentenceContainer");
        container.innerHTML = "";
        currentInputs = [];

        const parts = sentence.split("#");
        const question = quizData[currentQuestion];
        const correctAnswer = question.correctAnswer;
        const isPartialType = question.type === "partial";
        const visibleLetters = question.visibleLetters || "";

        parts.forEach((part, index) => {
          // Add text part
          if (part.trim()) {
            const textSpan = document.createElement("span");
            textSpan.className = "sentence-text";
            textSpan.textContent = part;
            container.appendChild(textSpan);
          }

          // Add input fields for each letter (except for the last part)
          if (index < parts.length - 1) {
            const inputContainer = document.createElement("div");
            inputContainer.className = "input-container";
            inputContainer.style.display = "inline-block";
            inputContainer.style.margin = "0 8px";

            // Create inputs based on question type
            if (isPartialType && visibleLetters) {
              // Partial word completion
              for (let i = 0; i < visibleLetters.length; i++) {
                const input = document.createElement("input");
                input.type = "text";
                input.className = "blank-input";
                input.setAttribute("autocomplete", "off");
                input.setAttribute("spellcheck", "false");
                input.setAttribute("maxlength", "1");
                input.setAttribute("data-index", i);

                const visibleChar = visibleLetters[i];

                if (visibleChar !== "_") {
                  // Pre-filled letter
                  input.value = visibleChar.toUpperCase();
                  input.classList.add("prefilled");
                  input.readOnly = true;
                  input.tabIndex = -1; // Skip in tab navigation
                } else {
                  // Empty input for user to fill
                  input.addEventListener("input", handleLetterInput);
                  input.addEventListener("keydown", handleKeyDown);
                  input.addEventListener("paste", handlePaste);
                  currentInputs.push(input);
                }

                inputContainer.appendChild(input);
              }
            } else {
              // Complete word
              for (let i = 0; i < correctAnswer.length; i++) {
                const input = document.createElement("input");
                input.type = "text";
                input.className = "blank-input";
                input.setAttribute("autocomplete", "off");
                input.setAttribute("spellcheck", "false");
                input.setAttribute("maxlength", "1");
                input.setAttribute("data-index", i);

                input.addEventListener("input", handleLetterInput);
                input.addEventListener("keydown", handleKeyDown);
                input.addEventListener("paste", handlePaste);

                inputContainer.appendChild(input);
                currentInputs.push(input);
              }
            }

            container.appendChild(inputContainer);
          }
        });

        // Focus on first editable input
        const firstEditableInput = currentInputs[0];
        if (firstEditableInput) {
          setTimeout(() => firstEditableInput.focus(), 100);
        }
      }

      function handleLetterInput(event) {
        const input = event.target;
        const allInputs = Array.from(
          input.parentElement.querySelectorAll(".blank-input")
        );
        const editableInputs = allInputs.filter((inp) => !inp.readOnly);
        const currentEditableIndex = editableInputs.indexOf(input);

        // Convert to uppercase
        input.value = input.value.toUpperCase();

        // Move to next editable input if there's a value and next input exists
        if (input.value && currentEditableIndex < editableInputs.length - 1) {
          editableInputs[currentEditableIndex + 1].focus();
        }

        // Check if all editable inputs are filled
        checkAllInputsFilled();
      }

      function handleKeyDown(event) {
        const input = event.target;
        const allInputs = Array.from(
          input.parentElement.querySelectorAll(".blank-input")
        );
        const editableInputs = allInputs.filter((inp) => !inp.readOnly);
        const currentEditableIndex = editableInputs.indexOf(input);

        // Handle backspace
        if (event.key === "Backspace") {
          if (!input.value && currentEditableIndex > 0) {
            // Move to previous editable input if current is empty
            editableInputs[currentEditableIndex - 1].focus();
          }
        }

        // Handle Enter
        if (event.key === "Enter") {
          const continueBtn = getEl(containerEl, "continueBtn");
          if (continueBtn.classList.contains("active")) {
            checkAnswer();
          }
        }

        // Handle arrow keys
        if (event.key === "ArrowLeft" && currentEditableIndex > 0) {
          event.preventDefault();
          editableInputs[currentEditableIndex - 1].focus();
        }
        if (
          event.key === "ArrowRight" &&
          currentEditableIndex < editableInputs.length - 1
        ) {
          event.preventDefault();
          editableInputs[currentEditableIndex + 1].focus();
        }
      }

      function handlePaste(event) {
        event.preventDefault();
        const input = event.target;
        const allInputs = Array.from(
          input.parentElement.querySelectorAll(".blank-input")
        );
        const editableInputs = allInputs.filter((inp) => !inp.readOnly);
        const currentEditableIndex = editableInputs.indexOf(input);

        const pastedText = (event.clipboardData || window.clipboardData)
          .getData("text")
          .toUpperCase();

        // Fill editable inputs with pasted text
        for (
          let i = 0;
          i <
          Math.min(
            pastedText.length,
            editableInputs.length - currentEditableIndex
          );
          i++
        ) {
          editableInputs[currentEditableIndex + i].value = pastedText[i];
        }

        // Focus on the next empty input or last filled input
        const nextFocusIndex = Math.min(
          currentEditableIndex + pastedText.length,
          editableInputs.length - 1
        );
        editableInputs[nextFocusIndex].focus();

        checkAllInputsFilled();
      }

      function checkAllInputsFilled() {
        const continueBtn = getEl(containerEl, "continueBtn");
        // Only check editable inputs
        const editableInputs = currentInputs.filter((input) => !input.readOnly);
        const allFilled = editableInputs.every(
          (input) => input.value.trim() !== ""
        );

        if (allFilled) {
          continueBtn.className = "continue-btn active";
        } else {
          continueBtn.className = "continue-btn";
        }
      }

      function startQuestionTimer() {
        timerDbg.clearOrphanedInterval("FillInTheBlanks");
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        questionStartTime = Date.now();
        let seconds = 0;
        const timerText = getEl(containerEl, "timerText");
        if (timerText) timerText.textContent = "0:00";

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
        }, 1000);
        timerDbg.registerInterval("FillInTheBlanks", timerInterval);
      }

      function stopQuestionTimer() {
        if (timerInterval) {
          timerDbg.unregisterInterval("FillInTheBlanks");
          clearInterval(timerInterval);
          timerInterval = null;
        }
        const timerEl = getEl(containerEl, "timer");
        if (timerEl) timerEl.classList.remove("warning");
      }

      function checkAnswer() {
        const continueBtn = getEl(containerEl, "continueBtn");
        if (!continueBtn.classList.contains("active")) {
          return;
        }

        stopQuestionTimer();

        const question = quizData[currentQuestion];
        const allInputs = Array.from(containerEl.querySelectorAll(".blank-input"));

        // Get the user's complete word from all inputs (including prefilled)
        const userAnswer = allInputs
          .map((input) => input.value.trim())
          .join("")
          .toLowerCase();
        const correctAnswers = [question.correctAnswer.toLowerCase()];

        // Add alternatives to correct answers
        if (question.alternatives) {
          question.alternatives.forEach((alt) => {
            correctAnswers.push(alt.toLowerCase());
          });
        }

        // Check if user answer is correct
        const isCorrect = correctAnswers.includes(userAnswer);
        const correctAnswer = question.correctAnswer;

        // Store answer
        const timeSpent = Date.now() - questionStartTime;
        answers.push({
          question: question.sentence,
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          timeSpent,
        });

        if (isCorrect) {
          score++;
        }

        // Update input states
        allInputs.forEach((input, index) => {
          if (!input.readOnly) {
            input.disabled = true;
          }

          const userLetter = input.value.toLowerCase();
          const correctLetter = correctAnswer[index]?.toLowerCase();

          if (userLetter === correctLetter) {
            input.classList.add("correct");
          } else if (!input.readOnly) {
            input.classList.add("incorrect");
            // Show correct letter in incorrect inputs
            if (correctLetter) {
              input.value = correctLetter.toUpperCase();
              setTimeout(() => {
                input.classList.remove("incorrect");
                input.classList.add("correct");
              }, 1000);
            }
          }
        });

        // Hide continue button after submission
        continueBtn.style.display = "none";

        // Show feedback
        showFeedback(isCorrect, correctAnswer);
      }

      function showFeedback(isCorrect, correctAnswer) {
        clearTimeout(feedbackAutoAdvanceTimeout);
        const feedbackSection = getEl(containerEl, "feedbackSection");
        const feedbackTitle = getEl(containerEl, "feedbackTitle");
        const feedbackIcon = getEl(containerEl, "feedbackIcon");
        const correctAnswerText = getEl(containerEl, "correctAnswerText");

        feedbackSection.style.display = "block";

        if (isCorrect) {
          playSound("right answer SFX.wav");
          feedbackSection.className = "feedback-section correct";
          feedbackTitle.className = "feedback-title correct";
          feedbackTitle.textContent = "Correct!";
          correctAnswerText.className = "correct-answer-text";
          correctAnswerText.textContent = "Well done!";
          feedbackIcon.innerHTML = `
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="16,8 10,14 8,12"/>
                      `;
        } else {
          playSound("wrong answer SFX.wav");
          feedbackSection.className = "feedback-section incorrect";
          feedbackTitle.className = "feedback-title incorrect";
          feedbackTitle.textContent = "Incorrect";
          correctAnswerText.className =
            "correct-answer-text incorrect-feedback";
          correctAnswerText.textContent = `Correct answer: "${correctAnswer}"`;
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
        skillName: "Fill in the Blanks",
        stagesTotal: STAGES_TOTAL,
        getScoreText: ({ correct, total }) => `You got ${correct} out of ${total} correct.`,
        getNextQuizUrl: getNextQuizUrlFn,
        navigate: (url) => (typeof options.navigate === "function" ? options.navigate(url) : (window.location.href = url)),
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
          incrementSkillProgress("Fill in the Blanks", stagesCompletedThisSession);
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";
        },
        selectors: { resultsScreen: "resultsScreen", resultsScore: "resultsScore", resultsContinueBtn: "resultsContinueBtn", doneBtn: ".done-btn", questionCard: "questionCard", hideWhenResults: ["feedbackSection"] },
      });
      if (resultsHelper.unbind && resultsHelper.unbind.length) unbind.push(...resultsHelper.unbind);

      function showResults() {
        stagesCompletedThisSession++;
        cumulativeCorrect += score;
        cumulativeTotal += quizData.length;
        saveDetailedQuizResult("Fill in the Blanks");
        resultsHelper.showResults({ correct: cumulativeCorrect, total: cumulativeTotal, stagesCompletedThisSession });
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

          // Performance analysis
          consistency: sessionData.consistency,
          difficultyHandling: sessionData.difficultyScore,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual question details
          questionDetails: answers.map((answer, index) => ({
            questionId: quizData[index].id,
            questionType: quizData[index].type,
            difficulty: determineDifficulty(quizData[index]),
            isCorrect: answer.isCorrect,
            timeSpent: answer.timeSpent,
            userAnswer: answer.userAnswer,
            correctAnswer: answer.correctAnswer,
          })),
        };
        // Calculate session metrics
        function calculateSessionMetrics() {
          const totalTime = answers.reduce(
            (sum, answer) => sum + answer.timeSpent,
            0
          );
          const avgTime = totalTime / answers.length;

          // Calculate consistency - how stable user performance is
          const timeDeviations = answers.map((answer) =>
            Math.abs(answer.timeSpent - avgTime)
          );
          const avgDeviation =
            timeDeviations.reduce((sum, dev) => sum + dev, 0) /
            timeDeviations.length;
          const consistency = Math.max(0, 100 - (avgDeviation / avgTime) * 100);

          // Calculate difficulty handling score
          const difficultyScore = calculateDifficultyHandling();

          return {
            totalTime: Math.round(totalTime / 1000), // Convert to seconds
            avgTime: Math.round(avgTime / 1000), // Convert to seconds
            consistency: Math.round(consistency),
            difficultyScore: difficultyScore,
          };
        }
        // Determine question difficulty based on type and word characteristics
        function determineDifficulty(question) {
          let difficulty = 1; // Base difficulty (Easy)

          // Type-based difficulty
          if (question.type === "partial") {
            difficulty += 0.5; // Partial completion is easier
          } else {
            difficulty += 1; // Complete word is harder
          }

          // Word length difficulty
          const wordLength = question.correctAnswer.length;
          if (wordLength >= 8) {
            difficulty += 1; // Long words are harder
          } else if (wordLength >= 6) {
            difficulty += 0.5; // Medium words
          }

          // Alternatives count (more alternatives = easier)
          if (question.alternatives && question.alternatives.length > 2) {
            difficulty -= 0.2;
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
            easy: { correct: 0, total: 0 },
            medium: { correct: 0, total: 0 },
            hard: { correct: 0, total: 0 },
          };

          // Analyze performance by difficulty
          answers.forEach((answer, index) => {
            const difficulty = determineDifficulty(quizData[index]);
            difficultyStats[difficulty].total++;
            if (answer.isCorrect) {
              difficultyStats[difficulty].correct++;
            }
          });

          // Calculate weighted score based on difficulty handling
          let weightedScore = 0;
          let totalWeight = 0;

          Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
            if (stats.total > 0) {
              const accuracy = stats.correct / stats.total;
              const weight =
                difficulty === "easy" ? 1 : difficulty === "medium" ? 1.5 : 2;
              weightedScore += accuracy * weight * 100;
              totalWeight += weight;
            }
          });

          return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
        }
        // Calculate final session score
        function calculateSessionScore(sessionData) {
          const accuracy = (score / quizData.length) * 100;

          // Scoring weights
          const weights = {
            accuracy: 0.6, // 60% - Most important
            consistency: 0.2, // 20% - Performance stability
            difficulty: 0.15, // 15% - Handling hard questions
            speed: 0.05, // 5% - Time efficiency
          };

          // Speed score based on average time (optimal range: 10-20 seconds)
          const optimalTime = 15; // seconds
          const timeDiff = Math.abs(sessionData.avgTime - optimalTime);
          const speedScore = Math.max(0, 100 - (timeDiff / optimalTime) * 50);

          // Calculate final weighted score
          const finalScore =
            accuracy * weights.accuracy +
            sessionData.consistency * weights.consistency +
            sessionData.difficultyScore * weights.difficulty +
            speedScore * weights.speed;

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
            const sessions = existingSessions
              ? JSON.parse(existingSessions)
              : [];

            // Add new session
            sessions.push(sessionResult);

            // Keep only last 20 sessions to prevent storage overflow
            if (sessions.length > 20) {
              sessions.splice(0, sessions.length - 20);
            }

            // Save back to localStorage
            localStorage.setItem(historyKey, JSON.stringify(sessions));

            console.log(
              `Saved session to ${historyKey}. Total sessions: ${sessions.length}`
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
            0
          );
          const totalCorrect = allSessions.reduce(
            (sum, session) => sum + session.correctAnswers,
            0
          );
          const overallAccuracy = (totalCorrect / totalQuestions) * 100;

          // Calculate improvement (compare first vs last session)
          const firstSession = allSessions[0];
          const lastSession = allSessions[allSessions.length - 1];
          const improvement = lastSession.accuracy - firstSession.accuracy;

          // Calculate average session score
          const avgSessionScore =
            allSessions.reduce(
              (sum, session) => sum + session.sessionScore,
              0
            ) / allSessions.length;

          // Calculate consistency across sessions
          const sessionScores = allSessions.map((s) => s.sessionScore);
          const scoreStdDev = calculateStandardDeviation(sessionScores);
          const crossSessionConsistency = Math.max(0, 100 - scoreStdDev);

          // Final skill score calculation
          const skillWeights = {
            accuracy: 0.4,
            avgScore: 0.3,
            improvement: 0.2,
            consistency: 0.1,
          };

          const normalizedImprovement = Math.max(
            0,
            Math.min(100, improvement + 50)
          ); // Normalize to 0-100

          const finalSkillScore =
            overallAccuracy * skillWeights.accuracy +
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
            averageSessionScore: Math.round(avgSessionScore),
            improvement: Math.round(improvement),
            consistency: Math.round(crossSessionConsistency),

            // Final score
            finalScore: Math.round(finalSkillScore),
            level: determineSkillLevel(finalSkillScore),

            // Additional insights
            strongPoints: identifyStrongPoints(allSessions),
            weakPoints: identifyWeakPoints(allSessions),
            recommendations: generateRecommendations(
              allSessions,
              finalSkillScore
            ),
          };

          // Save overall assessment
          const assessmentKey = `${skillName
            .replace(/\s+/g, "_")
            .toLowerCase()}_assessment`;
          localStorage.setItem(assessmentKey, JSON.stringify(skillAssessment));

          console.log(
            `Updated overall assessment for ${skillName}:`,
            skillAssessment
          );
        }
        // Helper function to calculate standard deviation
        function calculateStandardDeviation(values) {
          const mean =
            values.reduce((sum, val) => sum + val, 0) / values.length;
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

          // Check consistency
          const consistencyScores = sessions.map((s) => s.consistency);
          const avgConsistency =
            consistencyScores.reduce((sum, c) => sum + c, 0) /
            consistencyScores.length;
          if (avgConsistency >= 75) {
            strongPoints.push("Consistent performance across sessions");
          }

          // Check difficulty handling
          const difficultyScores = sessions.map((s) => s.difficultyHandling);
          const avgDifficultyHandling =
            difficultyScores.reduce((sum, d) => sum + d, 0) /
            difficultyScores.length;
          if (avgDifficultyHandling >= 70) {
            strongPoints.push("Good handling of difficult questions");
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

          // Check time management
          const avgTime =
            sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
            sessions.length;
          if (avgTime > 25) {
            weakPoints.push("Consider working on speed");
          }

          // Check consistency
          const sessionScores = sessions.map((s) => s.sessionScore);
          const scoreStdDev = calculateStandardDeviation(sessionScores);
          if (scoreStdDev > 15) {
            weakPoints.push(
              "Performance varies significantly between sessions"
            );
          }

          return weakPoints.length > 0
            ? weakPoints
            : ["Keep practicing to maintain progress"];
        }

        // Generate personalized recommendations
        function generateRecommendations(sessions, finalScore) {
          const recommendations = [];

          if (finalScore < 50) {
            recommendations.push("Focus on basic vocabulary building");
            recommendations.push(
              "Practice more frequently with shorter sessions"
            );
          } else if (finalScore < 70) {
            recommendations.push("Work on partial word completion exercises");
            recommendations.push("Time yourself to improve speed");
          } else if (finalScore < 85) {
            recommendations.push("Challenge yourself with longer words");
            recommendations.push("Focus on maintaining consistency");
          } else {
            recommendations.push("Excellent work! Try other skill types");
            recommendations.push("Help others or teach to reinforce learning");
          }

          return recommendations;
        }
        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);

        console.log(`Session saved for ${skillName}:`, sessionResult);
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

        localStorage.setItem(
          "fillBlanksProgress",
          JSON.stringify(progressData)
        );
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
        window.showConfirmDialog("Are you sure you want to exit the quiz?").then(function(confirmed) {
          if (confirmed) {
            if (stagesCompletedThisSession > 0) {
              incrementSkillProgress("Fill in the Blanks", stagesCompletedThisSession);
            }
            if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "/";
          }
        });
      }

      const keydownHandler = function (event) {
        if (!dataLoaded || getEl(containerEl, "quizContainer").style.display === "none") return;
        if (event.key === "Escape") goBack();
      };
      document.addEventListener("keydown", keydownHandler);
      const errScreen = getEl(containerEl, "errorScreen");
      if (errScreen) {
        const errorBtns = errScreen.querySelectorAll(".retry-data-btn");
        if (errorBtns[0]) { errorBtns[0].addEventListener("click", loadQuizData); unbind.push(() => errorBtns[0].removeEventListener("click", loadQuizData)); }
        if (errorBtns[1]) { errorBtns[1].addEventListener("click", goBack); unbind.push(() => errorBtns[1].removeEventListener("click", goBack)); }
      }
      const closeBtn = containerEl.querySelector(".close-btn");
      if (closeBtn) { closeBtn.addEventListener("click", goBack); unbind.push(() => closeBtn.removeEventListener("click", goBack)); }
      const contBtn = getEl(containerEl, "continueBtn");
      if (contBtn) { contBtn.addEventListener("click", checkAnswer); unbind.push(() => contBtn.removeEventListener("click", checkAnswer)); }
      loadQuizData();
      return function cleanup() {
        document.removeEventListener("keydown", keydownHandler);
        unbind.forEach((f) => f());
        if (timerInterval) clearInterval(timerInterval);
        if (feedbackAutoAdvanceTimeout) clearTimeout(feedbackAutoAdvanceTimeout);
      };
}
