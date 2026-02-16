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
      let stagesCompletedThisSession = 0;
      let cumulativeCorrect = 0;
      let cumulativeTotal = 0;
      let feedbackAutoAdvanceTimeout = null;
      let timeoutInterval;
      let speechSynthesis = window.speechSynthesis;
      let currentQuestionData = null;

      // Configuration
      const QUESTIONS_PER_QUIZ = 8;
      const STAGES_TOTAL = 6;
      const USED_QUESTIONS_KEY = "interactive_listening_used_questions";
      const QUESTION_TIMEOUT = 120000; // 2 minutes in milliseconds

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch("interactive listening data.json");
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
        document.getElementById("loadingScreen").style.display = "flex";
        document.getElementById("errorScreen").style.display = "none";
        document.getElementById("quizContainer").style.display = "none";
      }

      function hideLoadingScreen() {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("quizContainer").style.display = "flex";
      }

      function showErrorScreen(errorMessage) {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("quizContainer").style.display = "none";
        document.getElementById("errorScreen").style.display = "block";
        document.getElementById("errorMessage").textContent = errorMessage;
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

        // Initialize waveform
        generateWaveform();

        console.log(`Starting quiz with ${quizData.length} questions`);
        showQuestion();
      }

      // Generate waveform bars
      function generateWaveform() {
        const waveform = document.getElementById("audioWaveform");
        waveform.innerHTML = "";

        // Create approximately 40-50 bars for the waveform
        for (let i = 0; i < 45; i++) {
          const bar = document.createElement("div");
          bar.className = "waveform-bar";
          waveform.appendChild(bar);
        }
      }

      // Show Current Question
      // Update Progress Bar
      function updateProgressBar() {
        const progressFill = document.getElementById("stageProgressFill");
        const progressText = document.getElementById("stageProgressText");
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

        currentQuestionData = quizData[currentQuestion];

        // Update progress bar
        updateProgressBar();

        // Reset UI
        const submitBtn = document.getElementById("submitBtn");
        const playButton = document.getElementById("playButton");
        const audioStatus = document.getElementById("audioStatus");
        const questionsSection = document.getElementById("questionsSection");

        submitBtn.className = "submit-btn";
        submitBtn.textContent = "CONTINUE";
        submitBtn.style.display = "block";

        playButton.className = "play-button";

        // Hide audio status
        audioStatus.style.display = "none";

        // Populate questions
        populateQuestions(currentQuestionData.questions);

        // Hide feedback
        document.getElementById("feedbackSection").style.display = "none";

        // Start question timer and timeout
        startQuestionTimer();
        startQuestionTimeout();
      }

      function populateQuestions(questions) {
        const questionsSection = document.getElementById("questionsSection");
        questionsSection.innerHTML = "";

        questions.forEach((question, index) => {
          const questionDiv = document.createElement("div");
          questionDiv.className = "question-item";
          questionDiv.innerHTML = `
            <div class="question-text">${question.text}</div>
            <input 
              type="text" 
              class="question-input" 
              id="question-${index}"
              placeholder="${question.template}"
              data-template="${question.template}"
            />
          `;
          questionsSection.appendChild(questionDiv);

          // Add input listener
          const input = questionDiv.querySelector(".question-input");
          input.addEventListener("input", checkAllInputsFilled);
        });
      }

      function playAudio() {
        const playButton = document.getElementById("playButton");
        const audioStatus = document.getElementById("audioStatus");
        const waveformBars = document.querySelectorAll(".waveform-bar");

        // Check if speech synthesis is supported
        if (!speechSynthesis) {
          showAudioStatus(
            "Text-to-speech is not supported in your browser",
            "error"
          );
          return;
        }

        try {
          // Stop any current speech
          speechSynthesis.cancel();

          // Use scenario text for speech synthesis
          const textToSpeak = currentQuestionData.scenario;

          // Create utterance
          const utterance = new SpeechSynthesisUtterance(textToSpeak);

          // Configure speech
          utterance.rate = 0.8; // Slower for better comprehension
          utterance.pitch = 1.0;
          utterance.volume = 0.8;

          // Try to use an English voice
          const voices = speechSynthesis.getVoices();
          const englishVoice =
            voices.find(
              (voice) =>
                voice.lang.startsWith("en") && !voice.name.includes("Google")
            ) || voices.find((voice) => voice.lang.startsWith("en"));

          if (englishVoice) {
            utterance.voice = englishVoice;
          }

          // Event handlers
          utterance.onstart = function () {
            playButton.classList.add("playing");
            // Animate waveform bars
            waveformBars.forEach((bar, index) => {
              setTimeout(() => {
                bar.classList.add("playing-animation");
              }, index * 50);
            });
          };

          utterance.onend = function () {
            playButton.classList.remove("playing");
            // Stop waveform animation
            waveformBars.forEach((bar) => {
              bar.classList.remove("playing-animation");
            });
            hideAudioStatus();
          };

          utterance.onerror = function (event) {
            playButton.classList.remove("playing");
            // Stop waveform animation
            waveformBars.forEach((bar) => {
              bar.classList.remove("playing-animation");
            });
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
        const audioStatus = document.getElementById("audioStatus");
        if (type === "error") {
          audioStatus.textContent = message;
          audioStatus.className = `audio-status ${type}`;
          audioStatus.style.display = "block";
        }
      }

      function hideAudioStatus() {
        const audioStatus = document.getElementById("audioStatus");
        audioStatus.style.display = "none";
      }

      function checkAllInputsFilled() {
        const inputs = document.querySelectorAll(".question-input");
        const submitBtn = document.getElementById("submitBtn");

        let allFilled = true;
        inputs.forEach((input) => {
          if (input.value.trim().length === 0) {
            allFilled = false;
          }
        });

        if (allFilled) {
          submitBtn.className = "submit-btn active";
        } else {
          submitBtn.className = "submit-btn";
        }
      }

      function startQuestionTimer() {
        questionStartTime = Date.now();
        let seconds = 0;

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;

          const timerElement = document.getElementById("timer");
          const timerText = document.getElementById("timerText");

          timerText.textContent = `${minutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;

          // Warning color after 90 seconds
          if (seconds >= 90) {
            timerElement.classList.add("warning");
          }
        }, 1000);
      }

      function startQuestionTimeout() {
        timeoutInterval = setTimeout(() => {
          console.log("Question timed out");
          submitAnswers(true); // true indicates timeout
        }, QUESTION_TIMEOUT);
      }

      function stopQuestionTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        if (timeoutInterval) {
          clearTimeout(timeoutInterval);
        }

        // Reset timer color
        document.getElementById("timer").classList.remove("warning");
      }

      function submitAnswers(isTimeout = false) {
        const submitBtn = document.getElementById("submitBtn");

        // Don't allow double submission
        if (submitBtn.classList.contains("submitted")) {
          return;
        }

        if (!isTimeout && !submitBtn.classList.contains("active")) {
          return;
        }

        stopQuestionTimer();

        const inputs = document.querySelectorAll(".question-input");
        const userAnswers = [];
        const questionAnswers = currentQuestionData.questions;
        let correctCount = 0;

        // Collect answers and check correctness
        inputs.forEach((input, index) => {
          const userAnswer = input.value.trim();
          const correctAnswer = getCorrectAnswer(questionAnswers[index]);
          const isCorrect =
            !isTimeout &&
            checkAnswerCorrectness(userAnswer, questionAnswers[index]);

          userAnswers.push({
            question: questionAnswers[index].text,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            template: questionAnswers[index].template,
            isCorrect: isCorrect,
          });

          if (isCorrect) {
            correctCount++;
            input.classList.add("correct");
          } else {
            input.classList.add("incorrect");
          }

          input.classList.add("submitted");
          input.disabled = true;
        });

        // Store answer
        const timeSpent = Date.now() - questionStartTime;
        const overallCorrect = correctCount === questionAnswers.length;

        // Format question results for analytics
        const questionResults = userAnswers.map((answer) => ({
          questionText: answer.question,
          userAnswer: answer.userAnswer,
          correctAnswer: answer.correctAnswer,
          template: answer.template,
          isCorrect: answer.isCorrect,
        }));

        answers.push({
          scenarioId: currentQuestionData.id,
          scenario: currentQuestionData.scenario,
          userAnswers: userAnswers,
          isCorrect: overallCorrect,
          isTimeout: isTimeout,
          timeSpent: timeSpent,
          correctInScenario: correctCount,
          questionsInScenario: questionAnswers.length,
          questionResults: questionResults,
        });

        if (overallCorrect) {
          score++;
        }

        // Update UI
        submitBtn.style.display = "none";

        // Show feedback
        showFeedback(overallCorrect, userAnswers, isTimeout);
      }

      function getCorrectAnswer(questionObj) {
        // Extract the correct answer from the template
        // This is a simplified approach - you might want to make this more sophisticated
        const template = questionObj.template;
        const blanks = template.match(/___+/g);
        if (blanks) {
          // For demonstration, we'll provide sample correct answers
          // In a real application, you'd have these in your data
          const sampleAnswers = {
            "I need to choose ___________.": "a destination",
            "My classmate and I are both ___________.": "good planners",
            "I am thinking about the use of ___________.": "social media",
            "I will start working ___________.": "next Monday",
            "I need to get ready by ___________.":
              "buying professional clothes",
            "My ___________ has been giving me guidance.": "mentor",
            "I am organizing a ___________.": "birthday party",
            "The party will be ___________.": "this Saturday evening",
            "This is special because it's a ___________.": "milestone birthday",
          };
          return sampleAnswers[template] || "sample answer";
        }
        return "sample answer";
      }

      function checkAnswerCorrectness(userAnswer, questionObj) {
        // This is a simplified check - in a real application you'd have more sophisticated matching
        const correctAnswer = getCorrectAnswer(questionObj);

        // Normalize both answers for comparison
        const normalizeText = (text) => {
          return text
            .toLowerCase()
            .replace(/[.,!?;:"']/g, "")
            .replace(/\s+/g, " ")
            .trim();
        };

        const normalizedUser = normalizeText(userAnswer);
        const normalizedCorrect = normalizeText(correctAnswer);

        // Check for exact match or partial match
        return (
          normalizedUser.includes(normalizedCorrect) ||
          normalizedCorrect.includes(normalizedUser) ||
          calculateSimilarity(normalizedUser, normalizedCorrect) >= 0.7
        );
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
                matrix[i - 1][j] + 1
              );
            }
          }
        }

        return matrix[str2.length][str1.length];
      }

      function showFeedback(isCorrect, userAnswers, isTimeout) {
        clearTimeout(feedbackAutoAdvanceTimeout);
        const feedbackSection = document.getElementById("feedbackSection");
        const feedbackTitle = document.getElementById("feedbackTitle");
        const feedbackIcon = document.getElementById("feedbackIcon");
        const feedbackDetails = document.getElementById("feedbackDetails");

        feedbackSection.style.display = "block";

        if (isCorrect) {
          playSound("right answer SFX.wav");
          feedbackSection.className = "feedback-section correct";
          feedbackTitle.className = "feedback-title correct";
          feedbackTitle.textContent = "Correct!";
          feedbackIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <polyline points="16,8 10,14 8,12"/>
          `;
          feedbackDetails.innerHTML =
            "<p style='color: #2e7d32; font-weight: 600;'>Well done! All your answers were correct.</p>";
        } else {
          playSound("wrong answer SFX.wav");
          feedbackSection.className = "feedback-section incorrect";
          feedbackTitle.className = "feedback-title incorrect";
          feedbackTitle.textContent = isTimeout ? "Time's up!" : "Incorrect";
          feedbackIcon.innerHTML = `
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          `;

          // Show detailed feedback
          let feedbackHTML = "";
          userAnswers.forEach((answer, index) => {
            feedbackHTML += `
              <div class="feedback-answer">
                <div class="question-label">${answer.question}</div>
                <div>Your answer: <span class="user-answer">${
                  answer.userAnswer || "(no answer)"
                }</span></div>
                <div>Correct answer: <span class="correct-answer">${
                  answer.correctAnswer
                }</span></div>
              </div>
            `;
          });
          feedbackDetails.innerHTML = feedbackHTML;
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

      function showResults() {
        stagesCompletedThisSession++;
        const stageCorrect = answers.reduce((sum, a) => sum + (a.correctInScenario || 0), 0);
        const stageTotal = answers.reduce((sum, a) => sum + (a.questionsInScenario || 0), 0);
        cumulativeCorrect += stageCorrect;
        cumulativeTotal += stageTotal;
        saveDetailedQuizResult("Interactive Listening");

        document.getElementById("questionCard").style.display = "none";
        document.getElementById("feedbackSection").style.display = "none";
        
        const resultsScoreEl = document.getElementById("resultsScore");
        if (resultsScoreEl) {
          resultsScoreEl.textContent = `You got ${cumulativeCorrect} out of ${cumulativeTotal} correct.`;
        }
        
        const continueBtn = document.getElementById("resultsContinueBtn");
        if (continueBtn) {
          const hasMoreStages = stagesCompletedThisSession < STAGES_TOTAL;
          const hasNextQuiz = typeof getNextQuizUrl === "function" && getNextQuizUrl("Interactive Listening");
          continueBtn.style.display = hasMoreStages || hasNextQuiz ? "inline-block" : "none";
        }
        
        document.getElementById("resultsScreen").style.display = "block";
      }

      function continueToNextStage() {
        if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {
          const nextUrl = getNextQuizUrl("Interactive Listening");
          if (nextUrl) {
            window.location.href = nextUrl;
            return;
          }
        }
        if (allQuizData.length > 0) {
          quizData = selectRandomQuestions(allQuizData, QUESTIONS_PER_QUIZ);
          if (quizData.length === 0) {
            const continueBtn = document.getElementById("resultsContinueBtn");
            if (continueBtn) continueBtn.style.display = "none";
            return;
          }
        }

        document.getElementById("resultsScreen").style.display = "none";
        document.getElementById("questionCard").style.display = "block";

        currentQuestion = 0;
        score = 0;
        answers = [];
        initializeQuiz();
      }

      // Go to Practice Page
      function goToPractice() {
        incrementSkillProgress("Interactive Listening", stagesCompletedThisSession);
        window.location.href = "index.html";
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

          // Performance analysis for interactive listening
          consistency: sessionData.consistency,
          difficultyHandling: sessionData.difficultyScore,
          listeningComprehension: sessionData.listeningComprehension,
          scenarioUnderstanding: sessionData.scenarioUnderstanding,
          responseAccuracy: sessionData.responseAccuracy,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual scenario details
          scenarioDetails: answers.map((answer, index) => ({
            scenarioId: answer.scenarioId,
            scenarioType: "interactive_listening",
            difficulty: determineScenarioDifficulty(quizData[index]),
            questionsInScenario: answer.questionsInScenario,
            correctInScenario: answer.correctInScenario,
            scenarioAccuracy:
              (answer.correctInScenario / answer.questionsInScenario) * 100,
            timeSpent: answer.timeSpent,
            questionResults: answer.questionResults || answer.userAnswers,
            scenario: answer.scenario,
            isTimeout: answer.isTimeout || false,
          })),
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);
        console.log(`Session saved for ${skillName}:`, sessionResult);
      }

      // Calculate total questions across all scenarios
      function getTotalQuestions() {
        return answers.reduce(
          (total, answer) => total + answer.questionsInScenario,
          0
        );
      }

      // Calculate session metrics specific to Interactive Listening
      function calculateSessionMetrics() {
        const totalTime = answers.reduce(
          (sum, answer) => sum + answer.timeSpent,
          0
        );
        const totalQuestions = getTotalQuestions();
        const avgTime = totalTime / totalQuestions;

        // Calculate consistency - how stable performance is across scenarios
        const scenarioAccuracies = answers.map(
          (answer) =>
            (answer.correctInScenario / answer.questionsInScenario) * 100
        );
        const avgScenarioAccuracy =
          scenarioAccuracies.reduce((sum, acc) => sum + acc, 0) /
          scenarioAccuracies.length;

        const accuracyDeviations = scenarioAccuracies.map((acc) =>
          Math.abs(acc - avgScenarioAccuracy)
        );
        const avgDeviation =
          accuracyDeviations.reduce((sum, dev) => sum + dev, 0) /
          accuracyDeviations.length;
        const consistency = Math.max(
          0,
          100 - (avgDeviation / avgScenarioAccuracy) * 100
        );

        // Calculate difficulty handling score
        const difficultyScore = calculateDifficultyHandling();

        // Calculate listening comprehension score
        const listeningComprehension = calculateListeningComprehension();

        // Calculate scenario understanding
        const scenarioUnderstanding = calculateScenarioUnderstanding();

        // Calculate response accuracy (how well answers match context)
        const responseAccuracy = calculateResponseAccuracy();

        return {
          totalTime: Math.round(totalTime / 1000), // Convert to seconds
          avgTime: Math.round(avgTime / 1000), // Convert to seconds
          consistency: Math.round(consistency),
          difficultyScore: difficultyScore,
          listeningComprehension: listeningComprehension,
          scenarioUnderstanding: scenarioUnderstanding,
          responseAccuracy: responseAccuracy,
        };
      }

      // Determine scenario difficulty based on complexity
      function determineScenarioDifficulty(scenario) {
        let difficulty = 1; // Base difficulty (Easy)

        const scenarioText = scenario.scenario.toLowerCase();
        const words = scenarioText.split(" ");
        const wordCount = words.length;

        // Length-based difficulty
        if (wordCount >= 25) {
          difficulty += 1; // Long scenarios are harder
        } else if (wordCount >= 15) {
          difficulty += 0.5; // Medium scenarios
        }

        // Complexity indicators
        const hasMultipleCharacters =
          (scenarioText.match(/\b[A-Z][a-z]+\b/g) || []).length >= 2;
        if (hasMultipleCharacters) {
          difficulty += 0.5; // Multiple people make it harder
        }

        // Complex situations
        const complexSituations = [
          "decision",
          "choose",
          "problem",
          "conflict",
          "plan",
          "prepare",
        ];
        const hasComplexSituation = complexSituations.some((word) =>
          scenarioText.includes(word)
        );
        if (hasComplexSituation) {
          difficulty += 0.5;
        }

        // Time references and specific details
        const hasTimeReferences =
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next|last)\b/i.test(
            scenarioText
          );
        const hasSpecificDetails =
          /\b(mountains|beach|work|clothes|job)\b/i.test(scenarioText);
        if (hasTimeReferences || hasSpecificDetails) {
          difficulty += 0.3;
        }

        // Number of questions in scenario
        const questionCount = scenario.questions.length;
        if (questionCount >= 3) {
          difficulty += 0.3;
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
          easy: { correct: 0, total: 0, scenarios: 0 },
          medium: { correct: 0, total: 0, scenarios: 0 },
          hard: { correct: 0, total: 0, scenarios: 0 },
        };

        // Analyze performance by difficulty
        answers.forEach((answer, index) => {
          const difficulty = determineScenarioDifficulty(quizData[index]);
          difficultyStats[difficulty].correct += answer.correctInScenario;
          difficultyStats[difficulty].total += answer.questionsInScenario;
          difficultyStats[difficulty].scenarios++;
        });

        // Calculate weighted score based on difficulty handling
        let weightedScore = 0;
        let totalWeight = 0;

        Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
          if (stats.total > 0) {
            const accuracy = (stats.correct / stats.total) * 100;
            const weight =
              difficulty === "easy" ? 1 : difficulty === "medium" ? 1.5 : 2;
            weightedScore += accuracy * weight;
            totalWeight += weight;
          }
        });

        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
      }

      // Calculate listening comprehension ability
      function calculateListeningComprehension() {
        let comprehensionScore = 0;
        let totalScenarios = 0;

        answers.forEach((answer, index) => {
          const scenario = quizData[index];
          const difficulty = determineScenarioDifficulty(scenario);

          // Base score from accuracy
          let scenarioScore =
            (answer.correctInScenario / answer.questionsInScenario) * 100;

          // Bonus for difficult scenarios
          if (difficulty === "hard") {
            scenarioScore *= 1.15;
          } else if (difficulty === "medium") {
            scenarioScore *= 1.05;
          }

          // Time bonus for efficient processing
          const timeBonus = calculateProcessingTimeBonus(
            answer.timeSpent,
            scenario.scenario.length,
            answer.questionsInScenario
          );
          scenarioScore += timeBonus;

          comprehensionScore += Math.min(scenarioScore, 110); // Cap at 110
          totalScenarios++;
        });

        return totalScenarios > 0 ? comprehensionScore / totalScenarios : 0;
      }

      // Calculate processing time bonus
      function calculateProcessingTimeBonus(
        timeSpent,
        scenarioLength,
        questionCount
      ) {
        const timeInSeconds = timeSpent / 1000;
        const wordsInScenario = scenarioLength / 5; // Approximate word count
        const optimalProcessingTime = wordsInScenario * 2 + questionCount * 15; // 2 sec per word + 15 sec per question

        if (timeInSeconds < optimalProcessingTime * 1.3) {
          // Within 130% of optimal time
          const efficiency = optimalProcessingTime / timeInSeconds;
          return Math.min(efficiency * 5, 10); // Max 10 bonus points
        }

        return 0;
      }

      // Calculate scenario understanding
      function calculateScenarioUnderstanding() {
        let understandingScore = 0;
        let totalScenarios = 0;

        answers.forEach((answer) => {
          // Perfect scenario understanding = all questions correct
          if (answer.correctInScenario === answer.questionsInScenario) {
            understandingScore += 100;
          } else {
            // Partial understanding
            const partialScore =
              (answer.correctInScenario / answer.questionsInScenario) * 80;
            understandingScore += partialScore;
          }
          totalScenarios++;
        });

        return totalScenarios > 0 ? understandingScore / totalScenarios : 0;
      }

      // Calculate response accuracy (contextual appropriateness)
      function calculateResponseAccuracy() {
        let accuracyScore = 0;
        let totalResponses = 0;

        answers.forEach((answer) => {
          // Use questionResults if available, otherwise use userAnswers
          const results = answer.questionResults || answer.userAnswers || [];

          results.forEach((result) => {
            const userAnswer = result.userAnswer || "";
            const questionText = result.questionText || result.question || "";
            const template = result.template || "";

            if (userAnswer && userAnswer.trim().length > 0) {
              // Check if response is contextually appropriate
              const contextScore = evaluateContextualAccuracy(
                userAnswer,
                questionText,
                template
              );
              accuracyScore += contextScore;
            }
            totalResponses++;
          });
        });

        return totalResponses > 0 ? accuracyScore / totalResponses : 0;
      }

      // Evaluate contextual accuracy of response
      function evaluateContextualAccuracy(userAnswer, questionText, template) {
        let score = 50; // Base score

        // Length appropriateness (not too short, not too long)
        const answerLength = userAnswer.trim().length;
        if (answerLength >= 3 && answerLength <= 20) {
          score += 20;
        } else if (answerLength >= 1 && answerLength <= 30) {
          score += 10;
        }

        // Contextual relevance (basic keyword matching)
        const questionLower = questionText.toLowerCase();
        const answerLower = userAnswer.toLowerCase();

        if (questionLower.includes("when") || questionLower.includes("time")) {
          if (
            answerLower.includes("monday") ||
            answerLower.includes("next") ||
            answerLower.includes("tomorrow") ||
            /\d/.test(answerLower)
          ) {
            score += 20;
          }
        }

        if (questionLower.includes("what") || questionLower.includes("need")) {
          if (
            answerLower.includes("clothes") ||
            answerLower.includes("buy") ||
            answerLower.includes("prepare") ||
            answerLower.includes("choose")
          ) {
            score += 20;
          }
        }

        if (questionLower.includes("who") || questionLower.includes("advice")) {
          if (
            answerLower.includes("friend") ||
            answerLower.includes("family") ||
            answerLower.includes("people") ||
            answerLower.includes("boss")
          ) {
            score += 20;
          }
        }

        // Grammar basic check (has some structure)
        if (userAnswer.includes(" ")) {
          score += 10; // Multi-word response
        }

        return Math.min(score, 100);
      }

      // Calculate final session score
      function calculateSessionScore(sessionData) {
        const accuracy = (score / getTotalQuestions()) * 100;

        // Scoring weights for interactive listening
        const weights = {
          accuracy: 0.35, // 35% - Overall correctness
          listeningComprehension: 0.25, // 25% - Understanding scenarios
          scenarioUnderstanding: 0.2, // 20% - Grasping full context
          responseAccuracy: 0.1, // 10% - Contextual appropriateness
          consistency: 0.05, // 5% - Performance stability
          difficulty: 0.05, // 5% - Handling complex scenarios
        };

        // Calculate final weighted score
        const finalScore =
          accuracy * weights.accuracy +
          sessionData.listeningComprehension * weights.listeningComprehension +
          sessionData.scenarioUnderstanding * weights.scenarioUnderstanding +
          sessionData.responseAccuracy * weights.responseAccuracy +
          sessionData.consistency * weights.consistency +
          sessionData.difficultyScore * weights.difficulty;

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

        // Calculate listening-specific metrics
        const avgListeningComprehension =
          allSessions.reduce(
            (sum, session) => sum + session.listeningComprehension,
            0
          ) / allSessions.length;

        const avgScenarioUnderstanding =
          allSessions.reduce(
            (sum, session) => sum + session.scenarioUnderstanding,
            0
          ) / allSessions.length;

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
          listeningComprehension: 0.25,
          scenarioUnderstanding: 0.2,
          avgScore: 0.15,
          improvement: 0.1,
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100

        const finalSkillScore =
          overallAccuracy * skillWeights.overallAccuracy +
          avgListeningComprehension * skillWeights.listeningComprehension +
          avgScenarioUnderstanding * skillWeights.scenarioUnderstanding +
          avgSessionScore * skillWeights.avgScore +
          normalizedImprovement * skillWeights.improvement;

        // Create overall assessment
        const skillAssessment = {
          skillName: skillName,
          lastUpdated: new Date().toISOString(),
          sessionsCompleted: allSessions.length,

          // Performance metrics
          overallAccuracy: Math.round(overallAccuracy),
          averageListeningComprehension: Math.round(avgListeningComprehension),
          averageScenarioUnderstanding: Math.round(avgScenarioUnderstanding),
          averageSessionScore: Math.round(avgSessionScore),
          improvement: Math.round(improvement),
          consistency: Math.round(crossSessionConsistency),

          // Interactive listening specific metrics
          averageTimePerQuestion: Math.round(
            allSessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
              allSessions.length
          ),
          averageResponseAccuracy: Math.round(
            allSessions.reduce((sum, s) => sum + s.responseAccuracy, 0) /
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

        // Check listening comprehension
        const avgListeningComprehension =
          sessions.reduce((sum, s) => sum + s.listeningComprehension, 0) /
          sessions.length;
        if (avgListeningComprehension >= 85) {
          strongPoints.push("Excellent listening comprehension");
        }

        // Check scenario understanding
        const avgScenarioUnderstanding =
          sessions.reduce((sum, s) => sum + s.scenarioUnderstanding, 0) /
          sessions.length;
        if (avgScenarioUnderstanding >= 80) {
          strongPoints.push("Strong scenario understanding");
        }

        // Check response accuracy
        const avgResponseAccuracy =
          sessions.reduce((sum, s) => sum + s.responseAccuracy, 0) /
          sessions.length;
        if (avgResponseAccuracy >= 75) {
          strongPoints.push("Contextually appropriate responses");
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
          weakPoints.push("Overall accuracy needs improvement");
        }

        // Check listening comprehension
        const avgListeningComprehension =
          sessions.reduce((sum, s) => sum + s.listeningComprehension, 0) /
          sessions.length;
        if (avgListeningComprehension < 65) {
          weakPoints.push("Focus on listening comprehension skills");
        }

        // Check scenario understanding
        const avgScenarioUnderstanding =
          sessions.reduce((sum, s) => sum + s.scenarioUnderstanding, 0) /
          sessions.length;
        if (avgScenarioUnderstanding < 60) {
          weakPoints.push("Work on understanding complete scenarios");
        }

        // Check response accuracy
        const avgResponseAccuracy =
          sessions.reduce((sum, s) => sum + s.responseAccuracy, 0) /
          sessions.length;
        if (avgResponseAccuracy < 65) {
          weakPoints.push(
            "Focus on providing contextually appropriate answers"
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
          recommendations.push("Focus on basic listening comprehension");
          recommendations.push("Practice with simple scenarios first");
          recommendations.push("Take time to understand the full context");
        } else if (finalScore < 70) {
          recommendations.push("Work on understanding complex scenarios");
          recommendations.push("Practice identifying key information");
          recommendations.push("Focus on providing relevant answers");
        } else if (finalScore < 85) {
          recommendations.push("Challenge yourself with longer scenarios");
          recommendations.push("Work on processing information quickly");
          recommendations.push(
            "Practice with scenarios involving multiple people"
          );
        } else {
          recommendations.push(
            "Excellent work! Try advanced listening materials"
          );
          recommendations.push("Practice with real-world scenarios");
          recommendations.push("Help others improve their listening skills");
        }

        // Specific recommendations based on weak areas
        const avgResponseAccuracy =
          sessions.reduce((sum, s) => sum + s.responseAccuracy, 0) /
          sessions.length;
        if (avgResponseAccuracy < 70) {
          recommendations.push(
            "Focus on giving answers that match the question context"
          );
        }

        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime > 30) {
          recommendations.push(
            "Practice processing scenarios more efficiently"
          );
        }

        return recommendations;
      }

      // Function to increment progress by 1
      function incrementSkillProgress(skillName, count = 1) {
        const currentProgress = getCurrentSkillProgress(skillName);
        const newCompleted = Math.min(currentProgress + count, 6);

        const progressData = {
          skill: skillName,
          completed: newCompleted,
          total: 6,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          "interactiveListeningProgress",
          JSON.stringify(progressData)
        );
        console.log(`Progress updated: ${skillName} - ${newCompleted}/6`);
      }

      function getCurrentSkillProgress(skillName) {
        try {
          const mainProgressData = localStorage.getItem("skillProgress");
          if (mainProgressData) {
            const allProgress = JSON.parse(mainProgressData);
            if (allProgress[skillName]) {
              return allProgress[skillName].completed || 0;
            }
          }
          return 0;
        } catch (error) {
          console.error("Error reading current progress:", error);
          return 0;
        }
      }

      function goBack() {
        window.showConfirmDialog("Are you sure you want to exit the quiz?").then(function(confirmed) {
          if (confirmed) {
            if (stagesCompletedThisSession > 0) {
              incrementSkillProgress("Interactive Listening", stagesCompletedThisSession);
            }
            window.location.href = "/";
          }
        });
      }

      // Keyboard Support
      document.addEventListener("keydown", function (event) {
        if (
          !dataLoaded ||
          document.getElementById("quizContainer").style.display === "none"
        ) {
          return;
        }

        if (event.key === "Escape") {
          goBack();
        } else if (event.key === "Enter" && event.ctrlKey) {
          const submitBtn = document.getElementById("submitBtn");
          if (submitBtn.classList.contains("active")) {
            submitAnswers();
          }
        } else if (event.key === " " && event.ctrlKey) {
          event.preventDefault();
          playAudio();
        }
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = function () {
            console.log("Voices loaded:", speechSynthesis.getVoices().length);
          };
        }

        loadQuizData();
      });