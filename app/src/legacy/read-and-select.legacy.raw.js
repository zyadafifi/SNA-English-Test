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

      // Configuration
      const QUESTIONS_PER_QUIZ = 20;
      const STAGES_TOTAL = 6;
      const USED_QUESTIONS_KEY = "sna_used_questions";

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch("read and select data.json");
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

          // Select 20 random questions avoiding previously used ones
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
        // Get previously used questions from localStorage
        const usedQuestions = getUsedQuestions();

        // Filter out used questions
        const availableQuestions = allQuestions.filter(
          (question) => !usedQuestions.includes(question.word)
        );

        // If no available questions, reset used questions and use all
        if (availableQuestions.length === 0) {
          console.log("All questions have been used. Resetting question pool.");
          clearUsedQuestions();
          return selectRandomQuestions(allQuestions, count);
        }

        // If available questions are less than required, use all available
        if (availableQuestions.length <= count) {
          console.log(
            `Only ${availableQuestions.length} questions available. Using all.`
          );
          const selectedWords = availableQuestions.map((q) => q.word);
          saveUsedQuestions([...usedQuestions, ...selectedWords]);
          return [...availableQuestions];
        }

        // Randomly select the required number of questions
        const shuffled = [...availableQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selectedQuestions = shuffled.slice(0, count);

        // Save the selected questions as used
        const selectedWords = selectedQuestions.map((q) => q.word);
        saveUsedQuestions([...usedQuestions, ...selectedWords]);

        return selectedQuestions;
      }

      // Get used questions from localStorage
      function getUsedQuestions() {
        try {
          const stored = localStorage.getItem(USED_QUESTIONS_KEY);
          return stored ? JSON.parse(stored) : [];
        } catch (error) {
          console.error("Error reading used questions:", error);
          return [];
        }
      }

      // Save used questions to localStorage
      function saveUsedQuestions(questions) {
        try {
          localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(questions));
        } catch (error) {
          console.error("Error saving used questions:", error);
        }
      }

      // Clear used questions (reset the pool)
      function clearUsedQuestions() {
        try {
          localStorage.removeItem(USED_QUESTIONS_KEY);
        } catch (error) {
          console.error("Error clearing used questions:", error);
        }
      }

      // Reset question pool function (can be called manually if needed)
      function resetQuestionPool() {
        clearUsedQuestions();
        console.log(
          "Question pool has been reset. All questions are now available again."
        );
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

      // Show Error Screen
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

        // Update quiz title if provided in config
        if (quizConfig.title) {
          document.getElementById("questionTitle").textContent =
            quizConfig.title;
        }

        // Questions are already randomized in selectRandomQuestions
        // No need to shuffle again unless specified in config
        if (quizConfig.shuffleQuestions) {
          shuffleArray(quizData);
        }

        console.log(`Starting quiz with ${quizData.length} questions`);
        showQuestion();
      }

      // Shuffle Array Function
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      // Update Progress Bar (current stage only until CONTINUE; then cumulative)
      function updateProgressBar() {
        const progressFill = document.getElementById("stageProgressFill");
        const progressText = document.getElementById("stageProgressText");
        if (!progressFill || !progressText) return;

        let completed, total, percentage;
        if (stagesCompletedThisSession === 0) {
          // First stage: show current stage only (e.g. 5/20)
          completed = currentQuestion;
          total = quizData.length;
        } else {
          // User chose to continue: show cumulative (e.g. 25/120)
          total = STAGES_TOTAL * QUESTIONS_PER_QUIZ;
          completed = stagesCompletedThisSession * QUESTIONS_PER_QUIZ + currentQuestion;
        }
        percentage = total > 0 ? (completed / total) * 100 : 0;
        progressFill.style.width = percentage + "%";
        progressText.textContent = completed + "/" + total;
      }

      // Show Current Question
      function showQuestion() {
        if (currentQuestion >= quizData.length) {
          showResults();
          return;
        }

        const question = quizData[currentQuestion];
        document.getElementById("wordDisplay").textContent = question.word;

        // Reset buttons
        const yesBtn = document.getElementById("yesBtn");
        const noBtn = document.getElementById("noBtn");
        yesBtn.className = "answer-btn";
        noBtn.className = "answer-btn";
        yesBtn.disabled = false;
        noBtn.disabled = false;

        // Hide feedback
        document.getElementById("feedbackSection").style.display = "none";

        // Reset timer display
        document.getElementById("timerText").textContent = "0:00";

        // Update progress bar
        updateProgressBar();

        // Start question timer
        startQuestionTimer();
      }

      // Start Question Timer
      function startQuestionTimer() {
        questionStartTime = Date.now();
        let seconds = 0;

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          document.getElementById(
            "timerText"
          ).textContent = `${minutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
        }, 1000);
      }

      // Stop Question Timer
      function stopQuestionTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      }

      // Select Answer
      function selectAnswer(userAnswer) {
        stopQuestionTimer();

        const question = quizData[currentQuestion];
        const isCorrect = userAnswer === question.isReal;

        // Store answer
        const timeSpent = Date.now() - questionStartTime;
        answers.push({
          question: question.word,
          userAnswer,
          correctAnswer: question.isReal,
          isCorrect,
          timeSpent,
        });

        if (isCorrect) {
          score++;
        }

        // Update button states
        const yesBtn = document.getElementById("yesBtn");
        const noBtn = document.getElementById("noBtn");

        // Disable buttons
        yesBtn.disabled = true;
        noBtn.disabled = true;

        // Show selected state
        if (userAnswer) {
          yesBtn.classList.add("selected");
        } else {
          noBtn.classList.add("selected");
        }

        // Show correct/incorrect states
        if (question.isReal) {
          yesBtn.classList.add("correct");
          if (!userAnswer) noBtn.classList.add("incorrect");
        } else {
          noBtn.classList.add("correct");
          if (userAnswer) yesBtn.classList.add("incorrect");
        }

        // Show feedback
        showFeedback(isCorrect, question.isReal);
      }

      // Show Feedback
      function showFeedback(isCorrect, correctAnswer) {
        clearTimeout(feedbackAutoAdvanceTimeout);
        const feedbackSection = document.getElementById("feedbackSection");
        const feedbackTitle = document.getElementById("feedbackTitle");
        const feedbackIcon = document.getElementById("feedbackIcon");

        feedbackSection.style.display = "flex";

        // Play sound effect
        if (isCorrect) {
          playSound("right answer SFX.wav");
          feedbackSection.className = "feedback-section correct";
          feedbackTitle.className = "feedback-title correct";
          feedbackTitle.textContent = "Correct!";
          feedbackIcon.innerHTML = `
                    <circle cx="12" cy="12" r="10" fill="#2e7d32"/>
                    <polyline points="9,12 11,14 15,10" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                `;
        } else {
          playSound("wrong answer SFX.wav");
          feedbackSection.className = "feedback-section incorrect";
          feedbackTitle.className = "feedback-title incorrect";
          feedbackTitle.textContent = "Incorrect";
          feedbackIcon.innerHTML = `
                    <circle cx="12" cy="12" r="10" fill="#c62828"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                `;
        }
        feedbackAutoAdvanceTimeout = setTimeout(nextQuestion, 2000);
      }

      // Play Sound Function
      function playSound(filename) {
        try {
          const audio = new Audio(filename);
          audio.volume = 0.5; // Set volume to 50%
          audio.play().catch((error) => {
            console.log("Could not play sound:", error);
          });
        } catch (error) {
          console.log("Error creating audio:", error);
        }
      }

      // Next Question
      function nextQuestion() {
        clearTimeout(feedbackAutoAdvanceTimeout);
        currentQuestion++;

        if (currentQuestion < quizData.length) {
          showQuestion();
        } else {
          showResults();
        }
      }

      // Show Results
      function showResults() {
        stagesCompletedThisSession++;
        cumulativeCorrect += score;
        cumulativeTotal += quizData.length;
        saveDetailedQuizResult("Read and Select");

        document.getElementById("questionCard").style.display = "none";
        document.getElementById("feedbackSection").style.display = "none";
        
        // Update results score (cumulative)
        const resultsScoreEl = document.getElementById("resultsScore");
        if (resultsScoreEl) {
          resultsScoreEl.textContent = `You got ${cumulativeCorrect} out of ${cumulativeTotal} correct.`;
        }
        
        // Show CONTINUE only if more stages remain; hide when all 6 done or no more questions
        const continueBtn = document.getElementById("resultsContinueBtn");
        if (continueBtn) {
          const hasMoreStages = stagesCompletedThisSession < STAGES_TOTAL;
          const hasNextQuiz = typeof getNextQuizUrl === "function" && getNextQuizUrl("Read and Select");
          continueBtn.style.display = hasMoreStages || hasNextQuiz ? "inline-block" : "none";
        }
        
        document.getElementById("resultsScreen").style.display = "block";
      }

      // Continue to next stage
      function continueToNextStage() {
        if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {
          const nextUrl = getNextQuizUrl("Read and Select");
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
        document.getElementById("questionCard").style.display = "flex";

        currentQuestion = 0;
        score = 0;
        answers = [];
        initializeQuiz();
      }

      // Go to Practice Page
      function goToPractice() {
        // Update progress for main page (all stages completed this session)
        incrementSkillProgress("Read and Select", stagesCompletedThisSession);

        // Navigate back to main page
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
          totalQuestions: quizData.length,
          correctAnswers: score,
          accuracy: (score / quizData.length) * 100,

          // Time analysis
          totalTimeSpent: sessionData.totalTime,
          averageTimePerQuestion: sessionData.avgTime,

          // Performance analysis specific to Read and Select
          vocabulary: sessionData.vocabularyScore,
          intuition: sessionData.intuitionScore,
          responsePattern: sessionData.responsePattern,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual question details
          questionDetails: answers.map((answer, index) => ({
            word: quizData[index].word,
            wordLength: quizData[index].word.length,
            isRealWord: quizData[index].isReal,
            userAnswer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            timeSpent: answer.timeSpent,
            difficulty: determineWordDifficulty(quizData[index]),
          })),
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);

        console.log(`Session saved for ${skillName}:`, sessionResult);
      }
      // Calculate session metrics specific to Read and Select
      function calculateSessionMetrics() {
        const totalTime = answers.reduce(
          (sum, answer) => sum + answer.timeSpent,
          0
        );
        const avgTime = totalTime / answers.length;

        // Calculate vocabulary score (performance on real words)
        const realWordQuestions = answers.filter(
          (answer, index) => quizData[index].isReal === true
        );
        const realWordCorrect = realWordQuestions.filter(
          (answer) => answer.isCorrect
        ).length;
        const vocabularyScore =
          realWordQuestions.length > 0
            ? (realWordCorrect / realWordQuestions.length) * 100
            : 0;

        // Calculate intuition score (performance on fake words)
        const fakeWordQuestions = answers.filter(
          (answer, index) => quizData[index].isReal === false
        );
        const fakeWordCorrect = fakeWordQuestions.filter(
          (answer) => answer.isCorrect
        ).length;
        const intuitionScore =
          fakeWordQuestions.length > 0
            ? (fakeWordCorrect / fakeWordQuestions.length) * 100
            : 0;

        // Analyze response pattern (bias towards yes/no)
        const yesResponses = answers.filter(
          (answer) => answer.userAnswer === true
        ).length;
        const noResponses = answers.filter(
          (answer) => answer.userAnswer === false
        ).length;
        const responseBias =
          Math.abs(yesResponses - noResponses) / answers.length;
        const responsePattern = {
          yesResponses,
          noResponses,
          bias: responseBias,
          isBalanced: responseBias < 0.3, // Less than 30% bias is considered balanced
        };

        return {
          totalTime: Math.round(totalTime / 1000), // Convert to seconds
          avgTime: Math.round(avgTime / 1000), // Convert to seconds
          vocabularyScore: Math.round(vocabularyScore),
          intuitionScore: Math.round(intuitionScore),
          responsePattern: responsePattern,
        };
      }

      // Determine word difficulty based on word characteristics
      function determineWordDifficulty(question) {
        const word = question.word;
        const wordLength = word.length;
        const isReal = question.isReal;

        let difficultyScore = 1; // Base difficulty

        // Length-based difficulty
        if (wordLength >= 12) {
          difficultyScore += 2; // Very long words are harder
        } else if (wordLength >= 8) {
          difficultyScore += 1; // Long words are moderately harder
        } else if (wordLength <= 4) {
          difficultyScore -= 0.5; // Short words are easier
        }

        // Real vs fake word difficulty
        if (isReal) {
          // Real words: longer and less common words are harder
          if (wordLength >= 10) {
            difficultyScore += 0.5;
          }
        } else {
          // Fake words: words that sound more realistic are harder to identify as fake
          if (hasRealisticPattern(word)) {
            difficultyScore += 1;
          }
        }

        // Clamp difficulty between 1-3
        difficultyScore = Math.max(1, Math.min(3, difficultyScore));

        if (difficultyScore <= 1.5) return "easy";
        if (difficultyScore <= 2.5) return "medium";
        return "hard";
      }

      // Check if a fake word has realistic English patterns
      function hasRealisticPattern(word) {
        // Common English ending patterns that make fake words seem real
        const realisticEndings = [
          "tion",
          "ness",
          "ment",
          "able",
          "ible",
          "ful",
          "less",
          "ing",
          "ed",
          "er",
          "est",
          "ly",
        ];
        const realisticPrefixes = [
          "un",
          "re",
          "pre",
          "dis",
          "mis",
          "over",
          "under",
          "out",
        ];

        const hasRealisticEnding = realisticEndings.some((ending) =>
          word.toLowerCase().endsWith(ending)
        );
        const hasRealisticPrefix = realisticPrefixes.some((prefix) =>
          word.toLowerCase().startsWith(prefix)
        );

        // Also check for common English letter combinations
        const commonPatterns = [
          "th",
          "er",
          "on",
          "an",
          "ed",
          "nd",
          "ha",
          "at",
          "le",
          "ing",
        ];
        const hasCommonPattern = commonPatterns.some((pattern) =>
          word.toLowerCase().includes(pattern)
        );

        return hasRealisticEnding || hasRealisticPrefix || hasCommonPattern;
      }

      // Calculate final session score for Read and Select
      function calculateSessionScore(sessionData) {
        const accuracy = (score / quizData.length) * 100;

        // Scoring weights for Read and Select
        const weights = {
          accuracy: 0.4, // 40% - Overall accuracy
          vocabulary: 0.25, // 25% - Performance on real words
          intuition: 0.25, // 25% - Performance on fake words
          speed: 0.05, // 5% - Response speed
          balance: 0.05, // 5% - Balanced responses (not biased to yes/no)
        };

        // Speed score (optimal time: 3-8 seconds per question for this type)
        const optimalTime = 5; // seconds
        const timeDiff = Math.abs(sessionData.avgTime - optimalTime);
        const speedScore = Math.max(0, 100 - (timeDiff / optimalTime) * 30);

        // Balance score (penalize heavy bias towards yes or no)
        const balanceScore = sessionData.responsePattern.isBalanced
          ? 100
          : Math.max(0, 100 - sessionData.responsePattern.bias * 200);

        // Calculate final weighted score
        const finalScore =
          accuracy * weights.accuracy +
          sessionData.vocabularyScore * weights.vocabulary +
          sessionData.intuitionScore * weights.intuition +
          speedScore * weights.speed +
          balanceScore * weights.balance;

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

        // Calculate vocabulary and intuition trends
        const avgVocabularyScore =
          allSessions.reduce((sum, s) => sum + s.vocabulary, 0) /
          allSessions.length;
        const avgIntuitionScore =
          allSessions.reduce((sum, s) => sum + s.intuition, 0) /
          allSessions.length;

        // Calculate consistency across sessions
        const sessionScores = allSessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        const crossSessionConsistency = Math.max(0, 100 - scoreStdDev);

        // Final skill score calculation
        const skillWeights = {
          accuracy: 0.35,
          avgScore: 0.25,
          improvement: 0.2,
          consistency: 0.1,
          specialization: 0.1, // Bonus for strong vocabulary or intuition
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100
        const specializationBonus = Math.max(
          avgVocabularyScore,
          avgIntuitionScore
        ); // Reward strength in either area

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

          // Specific to Read and Select
          vocabularyStrength: Math.round(avgVocabularyScore),
          intuitionStrength: Math.round(avgIntuitionScore),
          responseBalance: calculateOverallResponseBalance(allSessions),

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

      // Calculate overall response balance across all sessions
      function calculateOverallResponseBalance(sessions) {
        const totalYes = sessions.reduce(
          (sum, s) => sum + s.responsePattern.yesResponses,
          0
        );
        const totalNo = sessions.reduce(
          (sum, s) => sum + s.responsePattern.noResponses,
          0
        );
        const totalResponses = totalYes + totalNo;

        if (totalResponses === 0) return { isBalanced: true, bias: 0 };

        const bias = Math.abs(totalYes - totalNo) / totalResponses;
        return {
          isBalanced: bias < 0.2,
          bias: Math.round(bias * 100),
          yesPercentage: Math.round((totalYes / totalResponses) * 100),
          noPercentage: Math.round((totalNo / totalResponses) * 100),
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

        // Check vocabulary strength
        const avgVocabulary =
          sessions.reduce((sum, s) => sum + s.vocabulary, 0) / sessions.length;
        if (avgVocabulary >= 80) {
          strongPoints.push("Strong vocabulary recognition");
        }

        // Check intuition strength
        const avgIntuition =
          sessions.reduce((sum, s) => sum + s.intuition, 0) / sessions.length;
        if (avgIntuition >= 80) {
          strongPoints.push("Excellent intuition for identifying fake words");
        }

        // Check response balance
        const balancedSessions = sessions.filter(
          (s) => s.responsePattern.isBalanced
        ).length;
        if (balancedSessions / sessions.length >= 0.7) {
          strongPoints.push("Well-balanced decision making");
        }

        // Check speed
        const avgSpeed =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgSpeed <= 6) {
          strongPoints.push("Quick and confident responses");
        }

        // Check recent improvement
        if (sessions.length >= 3) {
          const recentSessions = sessions.slice(-3);
          const avgRecentScore =
            recentSessions.reduce((sum, s) => sum + s.sessionScore, 0) /
            recentSessions.length;
          const earlierSessions = sessions.slice(0, -3);
          const avgEarlierScore =
            earlierSessions.reduce((sum, s) => sum + s.sessionScore, 0) /
            earlierSessions.length;

          if (avgRecentScore > avgEarlierScore + 5) {
            strongPoints.push("Shows consistent improvement");
          }
        }

        return strongPoints.length > 0
          ? strongPoints
          : ["Shows learning potential"];
      }

      // Identify weak points from session data
      function identifyWeakPoints(sessions) {
        const weakPoints = [];

        // Check vocabulary weakness
        const avgVocabulary =
          sessions.reduce((sum, s) => sum + s.vocabulary, 0) / sessions.length;
        if (avgVocabulary < 60) {
          weakPoints.push("Vocabulary recognition needs improvement");
        }

        // Check intuition weakness
        const avgIntuition =
          sessions.reduce((sum, s) => sum + s.intuition, 0) / sessions.length;
        if (avgIntuition < 60) {
          weakPoints.push("Difficulty identifying fake words");
        }

        // Check response bias
        const biasedSessions = sessions.filter(
          (s) => !s.responsePattern.isBalanced
        ).length;
        if (biasedSessions / sessions.length >= 0.6) {
          const overallBalance = calculateOverallResponseBalance(sessions);
          if (overallBalance.yesPercentage > 70) {
            weakPoints.push("Tends to answer 'Yes' too often");
          } else if (overallBalance.noPercentage > 70) {
            weakPoints.push("Tends to answer 'No' too often");
          }
        }

        // Check speed issues
        const avgSpeed =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgSpeed > 12) {
          weakPoints.push("Takes too long to make decisions");
        } else if (avgSpeed < 2) {
          weakPoints.push("May be guessing too quickly");
        }

        // Check consistency issues
        const sessionScores = sessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        if (scoreStdDev > 20) {
          weakPoints.push("Performance varies significantly between sessions");
        }

        return weakPoints.length > 0
          ? weakPoints
          : ["Continue practicing to maintain progress"];
      }

      // Generate personalized recommendations
      function generateRecommendations(sessions, finalScore) {
        const recommendations = [];
        const avgVocabulary =
          sessions.reduce((sum, s) => sum + s.vocabulary, 0) / sessions.length;
        const avgIntuition =
          sessions.reduce((sum, s) => sum + s.intuition, 0) / sessions.length;

        if (finalScore < 40) {
          recommendations.push("Focus on basic English word patterns");
          recommendations.push("Read more English texts to improve vocabulary");
          recommendations.push("Practice with shorter, common words first");
        } else if (finalScore < 60) {
          if (avgVocabulary < avgIntuition) {
            recommendations.push("Expand your vocabulary through reading");
            recommendations.push("Use vocabulary building apps or flashcards");
          } else {
            recommendations.push(
              "Learn common English word formation patterns"
            );
            recommendations.push(
              "Practice identifying unrealistic letter combinations"
            );
          }
        } else if (finalScore < 80) {
          recommendations.push(
            "Challenge yourself with longer, less common words"
          );
          recommendations.push("Study etymology to understand word origins");
          recommendations.push(
            "Practice with academic or technical vocabulary"
          );
        } else {
          recommendations.push("Excellent work! Try other reading skills");
          recommendations.push("Consider advanced vocabulary challenges");
          recommendations.push("Help others improve their word recognition");
        }

        // Speed-specific recommendations
        const avgSpeed =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgSpeed > 10) {
          recommendations.push(
            "Try to make decisions more quickly - trust your instincts"
          );
        } else if (avgSpeed < 3) {
          recommendations.push("Take a moment to carefully consider each word");
        }

        return recommendations;
      }
      // Function to increment progress - accepts count for multi-stage completion
      function incrementSkillProgress(skillName, count = 1) {
        const currentProgress = getCurrentSkillProgress(skillName);
        const newCompleted = Math.min(currentProgress + count, 6); // Don't exceed 6

        const progressData = {
          skill: skillName,
          completed: newCompleted,
          total: 6,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          "readAndSelectProgress",
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

      // Restart Quiz
      function restartQuiz() {
        document.getElementById("questionCard").style.display = "flex";
        document.getElementById("resultsScreen").style.display = "none";

        // Load new set of random questions
        if (allQuizData.length > 0) {
          quizData = selectRandomQuestions(allQuizData, QUESTIONS_PER_QUIZ);
          if (quizData.length === 0) {
            showErrorScreen(
              "No new questions available. All questions have been used."
            );
            return;
          }
        }

        initializeQuiz();
      }

      // Go Back
      function goBack() {
        window.showConfirmDialog("Are you sure you want to exit the quiz?").then(function(confirmed) {
          if (confirmed) {
            if (stagesCompletedThisSession > 0) {
              incrementSkillProgress("Read and Select", stagesCompletedThisSession);
            }
            window.location.href = "/";
          }
        });
      }

      // Keyboard Support
      document.addEventListener("keydown", function (event) {
        // Only handle keys if quiz is active
        if (
          !dataLoaded ||
          document.getElementById("quizContainer").style.display === "none"
        ) {
          return;
        }

        if (event.key === "y" || event.key === "Y") {
          if (!document.getElementById("yesBtn").disabled) {
            selectAnswer(true);
          }
        } else if (event.key === "n" || event.key === "N") {
          if (!document.getElementById("noBtn").disabled) {
            selectAnswer(false);
          }
        } else if (event.key === "Enter" || event.key === " ") {
          const feedbackSection = document.getElementById("feedbackSection");
          if (feedbackSection.style.display === "flex") {
            nextQuestion();
          }
          event.preventDefault();
        } else if (event.key === "Escape") {
          goBack();
        }
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });