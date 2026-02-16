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
      let questionTimeout;
      let dataLoaded = false;
      let userAnswers = {};
      let stagesCompletedThisSession = 0;
      let cumulativeCorrect = 0;
      let cumulativeTotal = 0;
      let feedbackAutoAdvanceTimeout = null;

      // Configuration
      const QUESTIONS_PER_QUIZ = 3;
      const STAGES_TOTAL = 6;
      const USED_QUESTIONS_KEY = "interactive_reading_used_questions";
      const QUESTION_TIMEOUT = 420000; // 7 minutes in milliseconds

      // Load Quiz Data from JSON only
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch(getQuizDataUrl("interactive reading data.json"));
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
        userAnswers = {};

        // Remove this line since questionTitle element doesn't exist

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
        userAnswers = {};

        // Update progress bar
        updateProgressBar();

        // Update passage title
        getEl(containerEl, "passageTitle").textContent = "PASSAGE";

        // Create passage with blank spaces and questions
        createPassageAndQuestions(question);

        // Reset and show continue button
        const continueBtn = getEl(containerEl, "continueBtn");
        continueBtn.className = "continue-btn";
        continueBtn.textContent = "CONTINUE";
        continueBtn.style.display = "block";

        // Make sure question card is visible
        getEl(containerEl, "questionCard").style.display = "block";
        getEl(containerEl, "feedbackSection").style.display = "none";

        // Start question timer and timeout
        startQuestionTimer();
        startQuestionTimeout();
      }

      /**
       * Transform comprehension-format data (passage + questions with options)
       * into blank format by inserting # where correct answers appear in the passage.
       * For questions whose correct answer is not in the passage, appends # at the end.
       */
      function buildPassageWithBlanks(question) {
        let passage = question.passage || "";
        const questions = question.questions || [];
        if (questions.length === 0 || passage.includes("#")) return passage;

        const replacements = [];
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const correctText = (q.options && q.options[q.correctAnswer]) || "";
          if (!correctText) {
            replacements.push({ index: -1, length: 0, append: true });
            continue;
          }
          const idx = passage.toLowerCase().indexOf(correctText.toLowerCase());
          if (idx !== -1) {
            replacements.push({ index: idx, length: correctText.length });
          } else {
            replacements.push({ index: -1, length: 0, append: true });
          }
        }
        replacements.sort((a, b) => b.index - a.index);
        for (const r of replacements) {
          if (r.append) {
            passage = passage.trimEnd() + " #";
          } else {
            passage = passage.slice(0, r.index) + "#" + passage.slice(r.index + r.length);
          }
        }
        return passage;
      }

      function createPassageAndQuestions(question) {
        const passageContainer = getEl(containerEl, "passageContainer");
        const questionsContainer =
          getEl(containerEl, "questionsContainer");

        // Clear containers
        passageContainer.innerHTML = "";
        questionsContainer.innerHTML = "";

        const passageText = buildPassageWithBlanks(question);

        // Split passage by # markers
        const parts = passageText.split("#");
        let questionIndex = 0;

        parts.forEach((part, index) => {
          // Add text part
          if (part.trim()) {
            const textSpan = document.createElement("span");
            textSpan.className = "passage-text";
            textSpan.textContent = part;
            passageContainer.appendChild(textSpan);
          }

          // Add blank space and create question (except for the last part)
          if (index < parts.length - 1 && question.questions[questionIndex]) {
            // Add number marker before blank space
            const numberMarker = document.createElement("span");
            numberMarker.className = "blank-number";
            numberMarker.textContent = (questionIndex + 1).toString();
            passageContainer.appendChild(numberMarker);

            // Add blank space to passage
            const blankSpace = document.createElement("span");
            blankSpace.className = "answer-blank";
            blankSpace.setAttribute("data-question-index", questionIndex);
            passageContainer.appendChild(blankSpace);

            // Create question in right panel
            createQuestionItem(
              question.questions[questionIndex],
              questionIndex
            );

            questionIndex++;
          }
        });
      }

      function createQuestionItem(questionData, index) {
        const questionsContainer =
          getEl(containerEl, "questionsContainer");

        const questionDiv = document.createElement("div");
        questionDiv.className = "question-item";

        // Question number and label
        const questionNumber = document.createElement("div");
        questionNumber.className = "question-number";

        const circle = document.createElement("div");
        circle.className = "question-circle";
        circle.textContent = (index + 1).toString();

        const label = document.createElement("div");
        label.className = "question-label";
        label.textContent = questionData.question || "Select a word";

        questionNumber.appendChild(circle);
        questionNumber.appendChild(label);

        // Dropdown container
        const dropdownContainer = document.createElement("div");
        dropdownContainer.className = "question-dropdown";

        const select = document.createElement("select");
        select.className = "dropdown-select";
        select.setAttribute("data-question-index", index);

        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a word";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        // Add options from question data
        questionData.options.forEach((option, optionIndex) => {
          const optionElement = document.createElement("option");
          optionElement.value = optionIndex;
          optionElement.textContent = option;
          select.appendChild(optionElement);
        });

        // Add change event listener
        select.addEventListener("change", function () {
          handleDropdownChange(index, parseInt(this.value), this);
        });

        dropdownContainer.appendChild(select);
        questionDiv.appendChild(questionNumber);
        questionDiv.appendChild(dropdownContainer);
        questionsContainer.appendChild(questionDiv);
      }

      function handleDropdownChange(
        questionIndex,
        selectedValue,
        selectElement
      ) {
        // Store the answer
        userAnswers[questionIndex] = selectedValue;

        // Update dropdown style to show selection
        selectElement.classList.add("selected");

        // Update the corresponding blank space in the passage
        const blankSpace = containerEl.querySelector(
          `[data-question-index="${questionIndex}"]`
        );
        if (blankSpace) {
          const selectedOption = selectElement.options[selectedValue + 1]; // +1 because of default option
          if (selectedOption) {
            blankSpace.textContent = selectedOption.textContent;
            blankSpace.style.color = "#666";
            blankSpace.style.fontWeight = "500";
            blankSpace.style.backgroundColor = "rgba(102, 102, 102, 0.1)";
            blankSpace.style.padding = "2px 4px";
            blankSpace.style.borderRadius = "3px";
          }
        }

        // Check if all questions are answered
        checkAllQuestionsAnswered();
      }

      function checkAllQuestionsAnswered() {
        const totalQuestions = quizData[currentQuestion].questions.length;
        const answeredQuestions = Object.keys(userAnswers).length;

        const continueBtn = getEl(containerEl, "continueBtn");
        if (answeredQuestions === totalQuestions) {
          continueBtn.className = "continue-btn active";
        } else {
          continueBtn.className = "continue-btn";
        }
      }

      function startQuestionTimer() {
        timerDbg.clearOrphanedInterval("InteractiveReading");
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
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (seconds >= 300 && timerElement) timerElement.classList.add("warning");
        }, 1000);
        timerDbg.registerInterval("InteractiveReading", timerInterval);
      }

      function startQuestionTimeout() {
        if (questionTimeout) {
          clearTimeout(questionTimeout);
          questionTimeout = null;
        }
        questionTimeout = setTimeout(() => {
          // Auto-submit as incorrect if no answer after 7 minutes
          console.log("Question timed out after 7 minutes");
          checkAnswer(true); // true indicates timeout
        }, QUESTION_TIMEOUT);
      }

      function stopQuestionTimer() {
        if (timerInterval) {
          timerDbg.unregisterInterval("InteractiveReading");
          clearInterval(timerInterval);
          timerInterval = null;
        }
        if (questionTimeout) {
          clearTimeout(questionTimeout);
          questionTimeout = null;
        }
        const timerEl = getEl(containerEl, "timer");
        if (timerEl) timerEl.classList.remove("warning");
      }

      function checkAnswer(isTimeout = false) {
        const continueBtn = getEl(containerEl, "continueBtn");
        if (!isTimeout && !continueBtn.classList.contains("active")) {
          return;
        }

        stopQuestionTimer();

        const question = quizData[currentQuestion];
        const questionsData = question.questions;

        let correctCount = 0;
        let totalQuestions = questionsData.length;
        let correctAnswers = [];

        // Check each answer
        questionsData.forEach((q, index) => {
          const userAnswer = userAnswers[index];
          const correctAnswer = q.correctAnswer;
          correctAnswers.push(correctAnswer);

          if (userAnswer === correctAnswer) {
            correctCount++;
          }
        });

        const isCorrect = !isTimeout && correctCount === totalQuestions;

        // Store answer
        const timeSpent = Date.now() - questionStartTime;
        answers.push({
          question: question.id,
          userAnswers: userAnswers,
          correctAnswers: correctAnswers,
          isCorrect: isCorrect,
          isTimeout: isTimeout,
          timeSpent: timeSpent,
          correctCount: correctCount,
          totalQuestions: totalQuestions,
          questionResults: quizData[currentQuestion].questions.map((q, i) => ({
            userAnswer: userAnswers[i],
            correctAnswer: q.correctAnswer,
            isCorrect: userAnswers[i] === q.correctAnswer,
          })),
        });

        if (isCorrect) {
          score++;
        }

        // Update dropdown states and blank spaces
        const dropdowns = containerEl.querySelectorAll(".dropdown-select");
        dropdowns.forEach((dropdown, index) => {
          const questionIndex = parseInt(
            dropdown.getAttribute("data-question-index")
          );
          const userAnswer = userAnswers[questionIndex];
          const correctAnswer = questionsData[questionIndex].correctAnswer;

          dropdown.classList.add("submitted");

          // Update blank space with correct answer
          const blankSpace = containerEl.querySelector(
            `[data-question-index="${questionIndex}"]`
          );
          if (blankSpace) {
            const correctOption =
              questionsData[questionIndex].options[correctAnswer];
            blankSpace.textContent = correctOption;
            blankSpace.style.padding = "2px 4px";
            blankSpace.style.borderRadius = "3px";
            blankSpace.style.fontWeight = "500";

            if (userAnswer === correctAnswer) {
              dropdown.classList.add("correct");
              blankSpace.style.color = "#2e7d32";
              blankSpace.style.backgroundColor = "rgba(76, 175, 80, 0.2)";
            } else {
              dropdown.classList.add("incorrect");
              blankSpace.style.color = "#c62828";
              blankSpace.style.backgroundColor = "rgba(244, 67, 54, 0.2)";
            }
          }

          if (userAnswer === correctAnswer) {
            dropdown.classList.add("correct");
          } else {
            dropdown.classList.add("incorrect");
            // Show correct answer in dropdown
            dropdown.value = correctAnswer;
            dropdown.classList.remove("incorrect");
            dropdown.classList.add("correct");
          }
        });

        // Hide continue button
        continueBtn.style.display = "none";

        // Show feedback
        showFeedback(
          isCorrect,
          correctAnswers,
          isTimeout,
          correctCount,
          totalQuestions
        );
      }

      function showFeedback(
        isCorrect,
        correctAnswers,
        isTimeout,
        correctCount,
        totalQuestions
      ) {
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
          correctAnswerText.textContent = `Perfect! You got all ${totalQuestions} questions correct.`;
          feedbackIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <polyline points="16,8 10,14 8,12"/>
          `;
        } else {
          playSound("wrong answer SFX.wav");
          feedbackSection.className = "feedback-section incorrect";
          feedbackTitle.className = "feedback-title incorrect";
          feedbackTitle.textContent = isTimeout
            ? "Time's up! (7 minutes)"
            : "Incorrect";
          correctAnswerText.className =
            "correct-answer-text incorrect-feedback";

          let feedbackText = "";
          if (isTimeout) {
            feedbackText =
              "Time ran out! Here are the correct answers:<br><br>";
          } else {
            feedbackText = `You got ${correctCount} out of ${totalQuestions} questions correct.<br><br><strong>Correct Answers:</strong><br><br>`;
          }

          const questionsData = quizData[currentQuestion].questions;
          const correctAnswersList = [];
          questionsData.forEach((q, index) => {
            const correctOption = q.options[q.correctAnswer];
            correctAnswersList.push(`${index + 1}. ${correctOption}`);
          });

          feedbackText += correctAnswersList.join(", ");

          correctAnswerText.innerHTML = feedbackText;

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
          // Reset and show the question card
          getEl(containerEl, "questionCard").style.display = "block";
          getEl(containerEl, "feedbackSection").style.display = "none";

          // Show the continue button
          const continueBtn = getEl(containerEl, "continueBtn");
          continueBtn.style.display = "block";
          continueBtn.className = "continue-btn";
          continueBtn.textContent = "CONTINUE";

          showQuestion();
        } else {
          showResults();
        }
      }

      const resultsHelper = initResultsScreen(containerEl, {
        skillName: "Interactive Reading",
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
          userAnswers = {};
          initializeQuiz();
        },
        onDone() {
          incrementSkillProgress("Interactive Reading", stagesCompletedThisSession);
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";
        },
        selectors: { resultsScreen: "resultsScreen", resultsScore: "resultsScore", resultsContinueBtn: "resultsContinueBtn", doneBtn: ".done-btn", questionCard: "questionCard", hideWhenResults: ["feedbackSection"] },
      });
      if (resultsHelper.unbind && resultsHelper.unbind.length) unbind.push(...resultsHelper.unbind);

      function showResults() {
        stagesCompletedThisSession++;
        const stageCorrect = answers.reduce((sum, a) => sum + (a.correctCount || 0), 0);
        const stageTotal = answers.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
        cumulativeCorrect += stageCorrect;
        cumulativeTotal += stageTotal;
        saveDetailedQuizResult("Interactive Reading");
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
          totalQuestions: getTotalQuestions(),
          correctAnswers: score,
          accuracy: (score / getTotalQuestions()) * 100,

          // Time analysis
          totalTimeSpent: sessionData.totalTime,
          averageTimePerQuestion: sessionData.avgTime,

          // Performance analysis specific to Interactive Reading
          passageComprehension: sessionData.passageComprehension,
          contextualInference: sessionData.contextualInference,
          multipleChoiceStrategy: sessionData.multipleChoiceStrategy,
          topicAnalysis: sessionData.topicAnalysis,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual passage details
          passageDetails: answers.map((answer, index) => ({
            passageId: quizData[index].id,
            topic: quizData[index].title,
            passageLength: quizData[index].passage.length,
            questionsInPassage: quizData[index].questions.length,
            passageCorrect: answer.questionsCorrect,
            passageTotal: answer.questionsTotal,
            passageAccuracy:
              (answer.questionsCorrect / answer.questionsTotal) * 100,
            timeSpent: answer.timeSpent,
            difficulty: determinePassageDifficulty(quizData[index]),
            questionDetails: answer.questionResults.map((result, qIndex) => ({
              questionText: quizData[index].questions[qIndex].question,
              userChoice: result.userAnswer,
              correctChoice: result.correctAnswer,
              isCorrect: result.isCorrect,
              options: quizData[index].questions[qIndex].options,
              questionType: analyzeQuestionType(
                quizData[index].questions[qIndex]
              ),
            })),
          })),
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);

        console.log(`Session saved for ${skillName}:`, sessionResult);
      }

      // Calculate total questions across all passages
      function getTotalQuestions() {
        return quizData.reduce(
          (total, passage) => total + passage.questions.length,
          0
        );
      }

      // Calculate session metrics specific to Interactive Reading
      function calculateSessionMetrics() {
        const totalTime = answers.reduce(
          (sum, answer) => sum + answer.timeSpent,
          0
        );
        const totalQuestions = getTotalQuestions();
        const avgTime = totalTime / totalQuestions;

        // Calculate passage comprehension score
        const passageComprehension = calculatePassageComprehension();

        // Calculate contextual inference ability
        const contextualInference = calculateContextualInference();

        // Analyze multiple choice strategy effectiveness
        const multipleChoiceStrategy = analyzeMultipleChoiceStrategy();

        // Analyze performance by topic
        const topicAnalysis = analyzeTopicPerformance();

        return {
          totalTime: Math.round(totalTime / 1000), // Convert to seconds
          avgTime: Math.round(avgTime / 1000), // Convert to seconds
          passageComprehension: Math.round(passageComprehension),
          contextualInference: Math.round(contextualInference),
          multipleChoiceStrategy: multipleChoiceStrategy,
          topicAnalysis: topicAnalysis,
        };
      }

      // Calculate passage comprehension ability
      function calculatePassageComprehension() {
        let totalScore = 0;
        let totalPassages = 0;

        answers.forEach((answer, index) => {
          const passage = quizData[index];
          const difficulty = determinePassageDifficulty(passage);

          // Base score from accuracy
          let passageScore =
            (answer.questionsCorrect / answer.questionsTotal) * 100;

          // Bonus for difficult passages
          if (difficulty === "hard") {
            passageScore *= 1.15;
          } else if (difficulty === "medium") {
            passageScore *= 1.05;
          }

          // Time bonus for efficient reading
          const timeBonus = calculateReadingTimeBonus(
            answer.timeSpent,
            passage.passage.length
          );
          passageScore += timeBonus;

          totalScore += Math.min(passageScore, 110); // Cap at 110
          totalPassages++;
        });

        return totalPassages > 0 ? totalScore / totalPassages : 0;
      }

      // Calculate contextual inference ability
      function calculateContextualInference() {
        let inferenceScore = 0;
        let inferenceQuestions = 0;

        answers.forEach((answer, passageIndex) => {
          const passage = quizData[passageIndex];

          answer.questionResults.forEach((result, questionIndex) => {
            const question = passage.questions[questionIndex];
            const questionType = analyzeQuestionType(question);

            if (questionType === "inference" || questionType === "contextual") {
              if (result.isCorrect) {
                inferenceScore += 100;
              }
              inferenceQuestions++;
            }
          });
        });

        return inferenceQuestions > 0 ? inferenceScore / inferenceQuestions : 0;
      }

      // Analyze multiple choice strategy effectiveness
      function analyzeMultipleChoiceStrategy() {
        const strategy = {
          totalQuestions: 0,
          correctChoices: 0,
          distractorAnalysis: {
            obviousWrong: 0, // Chose obviously wrong answer
            closeButWrong: 0, // Chose plausible but incorrect answer
            correctChoice: 0,
          },
        };

        answers.forEach((answer, passageIndex) => {
          const passage = quizData[passageIndex];

          answer.questionResults.forEach((result, questionIndex) => {
            const question = passage.questions[questionIndex];
            strategy.totalQuestions++;

            if (result.isCorrect) {
              strategy.correctChoices++;
              strategy.distractorAnalysis.correctChoice++;
            } else {
              // Analyze what type of wrong answer was chosen
              const choiceType = analyzeChoiceType(
                question,
                result.userAnswer,
                result.correctAnswer
              );
              if (choiceType === "obvious") {
                strategy.distractorAnalysis.obviousWrong++;
              } else {
                strategy.distractorAnalysis.closeButWrong++;
              }
            }
          });
        });

        return {
          accuracy:
            strategy.totalQuestions > 0
              ? (strategy.correctChoices / strategy.totalQuestions) * 100
              : 0,
          strategicThinking:
            strategy.distractorAnalysis.obviousWrong <
            strategy.totalQuestions * 0.2
              ? 100
              : 60,
          distractorResistance:
            strategy.distractorAnalysis.closeButWrong <
            strategy.totalQuestions * 0.3
              ? 100
              : 70,
        };
      }

      // Analyze performance by topic
      function analyzeTopicPerformance() {
        const topicPerformance = {};

        answers.forEach((answer, index) => {
          const passage = quizData[index];
          const topic = categorizePassageTopic(passage.title);

          if (!topicPerformance[topic]) {
            topicPerformance[topic] = {
              correct: 0,
              total: 0,
              passages: 0,
            };
          }

          topicPerformance[topic].correct += answer.questionsCorrect;
          topicPerformance[topic].total += answer.questionsTotal;
          topicPerformance[topic].passages++;
        });

        // Convert to percentages
        Object.keys(topicPerformance).forEach((topic) => {
          const data = topicPerformance[topic];
          data.accuracy =
            data.total > 0 ? (data.correct / data.total) * 100 : 0;
        });

        return topicPerformance;
      }

      // Determine passage difficulty
      function determinePassageDifficulty(passage) {
        let difficultyScore = 1; // Base difficulty

        // Passage length
        const passageLength = passage.passage.length;
        if (passageLength > 400) {
          difficultyScore += 1;
        } else if (passageLength > 250) {
          difficultyScore += 0.5;
        }

        // Number of questions
        const questionCount = passage.questions.length;
        if (questionCount >= 3) {
          difficultyScore += 0.5;
        }

        // Topic complexity
        const topic = categorizePassageTopic(passage.title);
        const complexTopics = ["technology", "science", "social", "academic"];
        if (complexTopics.includes(topic)) {
          difficultyScore += 0.5;
        }

        // Question type complexity
        const hasInferenceQuestions = passage.questions.some(
          (q) =>
            analyzeQuestionType(q) === "inference" ||
            analyzeQuestionType(q) === "contextual"
        );
        if (hasInferenceQuestions) {
          difficultyScore += 0.5;
        }

        // Clamp difficulty between 1-3
        difficultyScore = Math.max(1, Math.min(3, difficultyScore));

        if (difficultyScore <= 1.5) return "easy";
        if (difficultyScore <= 2.5) return "medium";
        return "hard";
      }

      // Analyze question type
      function analyzeQuestionType(question) {
        const questionText = question.question.toLowerCase();

        // Inference questions
        if (
          questionText.includes("suggest") ||
          questionText.includes("imply") ||
          questionText.includes("conclude") ||
          questionText.includes("infer")
        ) {
          return "inference";
        }

        // Contextual questions (require understanding context)
        if (
          questionText.includes("according to") ||
          questionText.includes("based on") ||
          questionText.includes("context") ||
          questionText.includes("passage")
        ) {
          return "contextual";
        }

        // Vocabulary questions
        if (
          questionText.includes("meaning") ||
          questionText.includes("refers to") ||
          questionText.includes("definition")
        ) {
          return "vocabulary";
        }

        // Detail questions (direct from text)
        return "detail";
      }

      // Categorize passage topic
      function categorizePassageTopic(title) {
        const titleLower = title.toLowerCase();

        if (
          titleLower.includes("technology") ||
          titleLower.includes("online") ||
          titleLower.includes("digital") ||
          titleLower.includes("computer")
        ) {
          return "technology";
        }

        if (
          titleLower.includes("environment") ||
          titleLower.includes("climate") ||
          titleLower.includes("energy") ||
          titleLower.includes("pollution")
        ) {
          return "environment";
        }

        if (
          titleLower.includes("health") ||
          titleLower.includes("exercise") ||
          titleLower.includes("food") ||
          titleLower.includes("medicine")
        ) {
          return "health";
        }

        if (
          titleLower.includes("education") ||
          titleLower.includes("learning") ||
          titleLower.includes("school") ||
          titleLower.includes("student")
        ) {
          return "education";
        }

        if (
          titleLower.includes("city") ||
          titleLower.includes("transport") ||
          titleLower.includes("urban") ||
          titleLower.includes("society")
        ) {
          return "social";
        }

        return "general";
      }

      // Analyze what type of wrong choice was made
      function analyzeChoiceType(question, userChoice, correctChoice) {
        const options = question.options;
        const userOption = options[userChoice];
        const correctOption = options[correctChoice];

        // Simple heuristic: if the wrong choice is very different from correct answer
        // in terms of word type or meaning, it's considered "obvious"
        const obviouslyWrongWords = [
          "ignore",
          "impossible",
          "expensive",
          "worries",
          "fears",
          "problems",
        ];

        if (obviouslyWrongWords.includes(userOption.toLowerCase())) {
          return "obvious";
        }

        return "plausible";
      }

      // Calculate reading time bonus
      function calculateReadingTimeBonus(timeSpent, passageLength) {
        const timeInSeconds = timeSpent / 1000;
        const wordsInPassage = passageLength / 5; // Approximate word count
        const optimalReadingSpeed = 200; // words per minute
        const optimalTime = (wordsInPassage / optimalReadingSpeed) * 60; // in seconds

        if (timeInSeconds < optimalTime * 1.5) {
          // Within 150% of optimal time
          const efficiency = optimalTime / timeInSeconds;
          return Math.min(efficiency * 5, 10); // Max 10 bonus points
        }

        return 0;
      }

      // Calculate final session score for Interactive Reading
      function calculateSessionScore(sessionData) {
        const accuracy = (score / getTotalQuestions()) * 100;

        // Scoring weights for Interactive Reading
        const weights = {
          accuracy: 0.35, // 35% - Overall accuracy
          passageComprehension: 0.25, // 25% - Understanding passages
          contextualInference: 0.2, // 20% - Making inferences
          strategy: 0.15, // 15% - Multiple choice strategy
          speed: 0.05, // 5% - Reading efficiency
        };

        // Speed score (efficient reading without rushing)
        const optimalTime = 45; // seconds per question on average
        const timeDiff = Math.abs(sessionData.avgTime - optimalTime);
        const speedScore = Math.max(0, 100 - (timeDiff / optimalTime) * 50);

        // Strategy score (average of strategic thinking measures)
        const strategyScore =
          (sessionData.multipleChoiceStrategy.strategicThinking +
            sessionData.multipleChoiceStrategy.distractorResistance) /
          2;

        // Calculate final weighted score
        const finalScore =
          accuracy * weights.accuracy +
          sessionData.passageComprehension * weights.passageComprehension +
          sessionData.contextualInference * weights.contextualInference +
          strategyScore * weights.strategy +
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
          allSessions.reduce((sum, session) => sum + session.sessionScore, 0) /
          allSessions.length;

        // Calculate average performance metrics
        const avgPassageComprehension =
          allSessions.reduce((sum, s) => sum + s.passageComprehension, 0) /
          allSessions.length;
        const avgContextualInference =
          allSessions.reduce((sum, s) => sum + s.contextualInference, 0) /
          allSessions.length;

        // Calculate topic strengths and weaknesses
        const topicAnalysis = consolidateTopicAnalysis(allSessions);

        // Calculate consistency across sessions
        const sessionScores = allSessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        const crossSessionConsistency = Math.max(0, 100 - scoreStdDev);

        // Final skill score calculation
        const skillWeights = {
          accuracy: 0.3,
          avgScore: 0.25,
          improvement: 0.2,
          consistency: 0.15,
          specialization: 0.1, // Bonus for strong areas
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100
        const specializationBonus = Math.max(
          avgPassageComprehension,
          avgContextualInference
        );

        const finalSkillScore =
          overallAccuracy * skillWeights.accuracy +
          avgSessionScore * skillWeights.avgScore +
          normalizedImprovement * skillWeights.improvement +
          crossSessionConsistency * skillWeights.consistency +
          specializationBonus * skillWeights.specialization;

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

          // Specific to Interactive Reading
          passageComprehensionStrength: Math.round(avgPassageComprehension),
          contextualInferenceStrength: Math.round(avgContextualInference),
          topicStrengths: topicAnalysis.strongest,
          topicWeaknesses: topicAnalysis.weakest,
          averageTimePerQuestion: Math.round(
            allSessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
              allSessions.length
          ),

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

      // Consolidate topic analysis across all sessions
      function consolidateTopicAnalysis(sessions) {
        const consolidatedTopics = {};

        sessions.forEach((session) => {
          Object.keys(session.topicAnalysis).forEach((topic) => {
            if (!consolidatedTopics[topic]) {
              consolidatedTopics[topic] = { correct: 0, total: 0 };
            }
            consolidatedTopics[topic].correct +=
              session.topicAnalysis[topic].correct;
            consolidatedTopics[topic].total +=
              session.topicAnalysis[topic].total;
          });
        });

        // Calculate accuracies and find strongest/weakest
        let strongest = { topic: "", accuracy: 0 };
        let weakest = { topic: "", accuracy: 100 };

        Object.keys(consolidatedTopics).forEach((topic) => {
          const data = consolidatedTopics[topic];
          const accuracy =
            data.total > 0 ? (data.correct / data.total) * 100 : 0;

          if (accuracy > strongest.accuracy) {
            strongest = { topic, accuracy };
          }
          if (accuracy < weakest.accuracy && data.total > 0) {
            weakest = { topic, accuracy };
          }
        });

        return { strongest, weakest, all: consolidatedTopics };
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

        // Check passage comprehension
        const avgComprehension =
          sessions.reduce((sum, s) => sum + s.passageComprehension, 0) /
          sessions.length;
        if (avgComprehension >= 80) {
          strongPoints.push("Excellent passage comprehension skills");
        }

        // Check contextual inference
        const avgInference =
          sessions.reduce((sum, s) => sum + s.contextualInference, 0) /
          sessions.length;
        if (avgInference >= 80) {
          strongPoints.push("Strong ability to make contextual inferences");
        }

        // Check multiple choice strategy
        const avgStrategy =
          sessions.reduce(
            (sum, s) =>
              sum +
              (s.multipleChoiceStrategy.strategicThinking +
                s.multipleChoiceStrategy.distractorResistance) /
                2,
            0
          ) / sessions.length;
        if (avgStrategy >= 85) {
          strongPoints.push("Effective multiple choice test-taking strategy");
        }

        // Check reading speed
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime <= 50) {
          strongPoints.push("Efficient reading speed");
        }

        // Check consistency
        const sessionScores = sessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        if (scoreStdDev <= 10) {
          strongPoints.push("Consistent performance across sessions");
        }

        return strongPoints.length > 0
          ? strongPoints
          : ["Shows potential for improvement"];
      }

      // Identify weak points from session data
      function identifyWeakPoints(sessions) {
        const weakPoints = [];

        // Check overall accuracy
        const avgAccuracy =
          sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;
        if (avgAccuracy < 65) {
          weakPoints.push("Overall accuracy needs improvement");
        }

        // Check comprehension issues
        const avgComprehension =
          sessions.reduce((sum, s) => sum + s.passageComprehension, 0) /
          sessions.length;
        if (avgComprehension < 60) {
          weakPoints.push("Passage comprehension could be stronger");
        }

        // Check inference issues
        const avgInference =
          sessions.reduce((sum, s) => sum + s.contextualInference, 0) /
          sessions.length;
        if (avgInference < 60) {
          weakPoints.push("Difficulty making contextual inferences");
        }

        // Check strategy issues
        const avgStrategy =
          sessions.reduce(
            (sum, s) =>
              sum +
              (s.multipleChoiceStrategy.strategicThinking +
                s.multipleChoiceStrategy.distractorResistance) /
                2,
            0
          ) / sessions.length;
        if (avgStrategy < 70) {
          weakPoints.push("Multiple choice strategy needs improvement");
        }

        // Check speed issues
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime > 80) {
          weakPoints.push("Reading speed could be faster");
        }

        return weakPoints.length > 0
          ? weakPoints
          : ["Continue practicing to maintain progress"];
      }

      // Generate personalized recommendations
      function generateRecommendations(sessions, finalScore) {
        const recommendations = [];
        const avgComprehension =
          sessions.reduce((sum, s) => sum + s.passageComprehension, 0) /
          sessions.length;
        const avgInference =
          sessions.reduce((sum, s) => sum + s.contextualInference, 0) /
          sessions.length;

        if (finalScore < 45) {
          recommendations.push("Focus on basic reading comprehension skills");
          recommendations.push("Practice with shorter passages first");
          recommendations.push(
            "Work on understanding main ideas before details"
          );
        } else if (finalScore < 65) {
          if (avgComprehension < avgInference) {
            recommendations.push(
              "Practice reading longer passages for better comprehension"
            );
            recommendations.push(
              "Focus on identifying main ideas and supporting details"
            );
          } else {
            recommendations.push("Work on making inferences from context");
            recommendations.push("Practice reading between the lines");
          }
        } else if (finalScore < 80) {
          recommendations.push(
            "Challenge yourself with more complex academic texts"
          );
          recommendations.push(
            "Practice different question types and strategies"
          );
          recommendations.push(
            "Work on increasing reading speed while maintaining accuracy"
          );
        } else {
          recommendations.push(
            "Excellent work! Try advanced reading materials"
          );
          recommendations.push(
            "Focus on specialized vocabulary in different fields"
          );
          recommendations.push(
            "Consider helping others improve their reading skills"
          );
        }

        // Topic-specific recommendations
        const topicAnalysis = consolidateTopicAnalysis(sessions);
        if (topicAnalysis.weakest.accuracy < 50) {
          recommendations.push(
            `Focus on ${topicAnalysis.weakest.topic} topic materials`
          );
        }

        return recommendations;
      }
      // Function to increment progress by 1 or more
      function incrementSkillProgress(skillName, count = 1) {
        // Get current progress first
        const currentProgress = getCurrentSkillProgress(skillName);
        const newCompleted = Math.min(currentProgress + count, 6); // Don't exceed 6

        const progressData = {
          skill: skillName,
          completed: newCompleted,
          total: 6,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          "interactiveReadingProgress",
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
              incrementSkillProgress("Interactive Reading", stagesCompletedThisSession);
            }
            if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "/";
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
          const continueBtn = getEl(containerEl, "continueBtn");
          if (continueBtn.classList.contains("active")) {
            checkAnswer();
          }
        }
      }; document.addEventListener("keydown", keydownHandler);
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
