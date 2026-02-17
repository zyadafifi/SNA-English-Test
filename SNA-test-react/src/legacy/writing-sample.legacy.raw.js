// Quiz Data
      let allQuizData = [];
      let quizData = null;
      let currentStage = 1;
      let stagesCompletedThisSession = 0;
      let userResponse = "";
      let questionStartTime = 0;
      let timerInterval;
      let writingTimeout;
      let dataLoaded = false;
      let answers = [];
      // Configuration
      const STAGES_TOTAL = 3;
      const WRITING_TIME_LIMIT = 300000; // 5 minutes in milliseconds
      const PREPARATION_TIME_LIMIT = 6000; // 6 seconds for preparation

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch("writing sample data.json");
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
          // Select random question
          const randomIndex = Math.floor(Math.random() * data.questions.length);
          quizData = data.questions[randomIndex];

          dataLoaded = true;
          hideLoadingScreen();
          initializeQuiz();
        } catch (error) {
          console.error("Error loading quiz data:", error);
          showErrorScreen(error.message);
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
        if (!dataLoaded || !quizData) {
          showErrorScreen("No quiz data available");
          return;
        }

        currentStage = 1;
        userResponse = "";
        setupPreparationStage();
      }

      // Update Progress Bar
      function updateProgressBar() {
        const completed = 0; // Single question quiz - always 0 until complete
        const total = 1;
        const percentage = 0;
        
        const progressFill = document.getElementById("stageProgressFill");
        const progressText = document.getElementById("stageProgressText");
        
        if (progressFill && progressText) {
          progressFill.style.width = percentage + "%";
          progressText.textContent = completed + "/" + total;
        }
      }

      // Setup Preparation Stage
      function setupPreparationStage() {
        // Update progress bar
        updateProgressBar();

        // Populate preparation content
        document.getElementById("preparationTitle").textContent =
          quizData.preparation.title;
        document.getElementById("preparationSubtitle").textContent =
          quizData.preparation.subtitle;
        document.getElementById("topicText").textContent = quizData.topic;

        // Show timer for preparation
        const timer = document.getElementById("timer");
        const timerLabel = document.getElementById("timerLabel");
        timer.style.display = "flex";
        timerLabel.textContent = "to prepare";

        // Start preparation timer
        startPreparationTimer();
      }

      // Start Writing Stage
      function startWriting() {
        clearTimeout(writingTimeout);
        clearInterval(timerInterval);

        currentStage = 2;

        // Hide preparation stage
        document.getElementById("preparationStage").style.display = "none";

        // Show writing stage
        const writingStage = document.getElementById("writingStage");
        writingStage.style.display = "block";

        // Populate writing content
        document.getElementById("writingTitle").textContent =
          quizData.writing.title;
        document.getElementById("writingTopic").textContent = quizData.topic;

        // Update timer label
        document.getElementById("timerLabel").textContent = "to write";

        // Focus on textarea
        const writingArea = document.getElementById("writingArea");
        writingArea.focus();

        // Add input listener
        writingArea.addEventListener("input", checkWritingInput);

        // Start writing timer
        startWritingTimer();
      }

      // Check writing input
      function checkWritingInput() {
        const writingArea = document.getElementById("writingArea");
        const continueBtn = document.getElementById("writingContinue");

        if (writingArea.value.trim().length > 0) {
          continueBtn.classList.add("active");
        } else {
          continueBtn.classList.remove("active");
        }
      }

      // Show Results Stage
      function showResults() {
        const writingArea = document.getElementById("writingArea");
        if (writingArea.value.trim().length === 0) {
          return;
        }

        clearInterval(timerInterval);
        clearTimeout(writingTimeout);

        userResponse = writingArea.value;
        currentStage = 3;
        // Store the answer
        answers.push({
          questionId: quizData.id,
          userResponse: userResponse,
          sampleAnswer: quizData.results.sampleAnswer,
          timeSpent: Date.now() - questionStartTime,
        });
        stagesCompletedThisSession++;
        saveDetailedQuizResult("Writing Sample");
        // Hide writing stage
        document.getElementById("writingStage").style.display = "none";

        // Show results stage
        const resultsStage = document.getElementById("resultsStage");
        resultsStage.style.display = "block";

        // Hide timer
        document.getElementById("timer").style.display = "none";

        // Populate results content
        document.getElementById("resultsTitle").textContent =
          quizData.results.title;
        document.getElementById("resultsTopic").textContent = quizData.topic;
        document.getElementById("userResponse").textContent = userResponse;
        document.getElementById("sampleTitle").textContent =
          quizData.results.sampleTitle;
        document.getElementById("sampleText").textContent =
          quizData.results.sampleAnswer;
      }

      // Timer Functions
      function startPreparationTimer() {
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

        // Auto-advance after preparation time
        writingTimeout = setTimeout(() => {
          startWriting();
        }, PREPARATION_TIME_LIMIT);
      }

      function startWritingTimer() {
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

          // Warning color after 4 minutes
          if (seconds >= 240) {
            timerElement.classList.add("warning");
          }
        }, 1000);

        // Auto-submit after writing time limit
        writingTimeout = setTimeout(() => {
          const writingArea = document.getElementById("writingArea");
          if (writingArea.value.trim().length > 0) {
            showResults();
          }
        }, WRITING_TIME_LIMIT);
      }

      function continueToNextStage() {
        if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {
          const nextUrl = getNextQuizUrl("Writing Sample");
          if (nextUrl) {
            window.location.href = nextUrl;
            return;
          }
        }
        const completedId = quizData?.id;
        document.getElementById("resultsStage").style.display = "none";
        document.getElementById("writingStage").style.display = "none";
        document.getElementById("preparationStage").style.display = "block";
        if (allQuizData.length > 0) {
          let available = allQuizData;
          if (completedId != null && allQuizData.length > 1) {
            available = allQuizData.filter((q) => q.id !== completedId);
          }
          const randomIndex = Math.floor(Math.random() * available.length);
          quizData = available[randomIndex];
        }
        answers = [];
        initializeQuiz();
      }

      // Navigation Functions
      function goToPractice() {
        incrementSkillProgress("Writing Sample", stagesCompletedThisSession);
        window.location.href = "index.html";
      }
      // Function to save detailed quiz result
      function saveDetailedQuizResult(skillName) {
        if (!answers || answers.length === 0) {
          console.log("No answers to save");
          return;
        }

        const sessionData = calculateSessionMetrics();

        // Create session result object
        const sessionResult = {
          skillName: skillName,
          sessionId: Date.now(),
          date: new Date().toISOString(),
          totalQuestions: 1, // Writing sample is just one question
          correctAnswers: 1, // Writing is always considered "correct"
          accuracy: 100,
          totalTimeSpent: answers[0].timeSpent / 1000, // Convert to seconds
          averageTimePerQuestion: answers[0].timeSpent / 1000,
          writingQuality: sessionData.writingQuality,
          responseLength: answers[0].userResponse.length,
          wordCount: countWords(answers[0].userResponse),
          sessionScore: calculateSessionScore(sessionData),
          questionDetails: [
            {
              questionId: answers[0].questionId,
              questionType: "writing_sample",
              difficulty: determineDifficulty(quizData),
              responseLength: answers[0].userResponse.length,
              responseWords: countWords(answers[0].userResponse),
              timeSpent: answers[0].timeSpent,
              userResponse: answers[0].userResponse,
              sampleAnswer: answers[0].sampleAnswer,
              topic: quizData.topic,
            },
          ],
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);
        console.log(`Session saved for ${skillName}:`, sessionResult);
      }

      // Calculate session metrics
      function calculateSessionMetrics() {
        if (!answers || answers.length === 0) {
          return {
            totalTime: 0,
            avgTime: 0,
            writingQuality: 0,
            avgResponseLength: 0,
            writingFluency: 0,
          };
        }

        const answer = answers[0];
        const response = answer.userResponse;
        const timeMinutes = answer.timeSpent / 60000;

        return {
          totalTime: Math.round(answer.timeSpent / 1000),
          avgTime: Math.round(answer.timeSpent / 1000),
          writingQuality: calculateWritingQuality([answer]),
          avgResponseLength: response.length,
          writingFluency:
            timeMinutes > 0
              ? Math.round(countWords(response) / timeMinutes)
              : 0,
        };
      }

      // Count words in response
      function countWords(text) {
        return text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
      }

      // Count lines in response
      function countLines(text) {
        return text.split("\n").filter((line) => line.trim().length > 0).length;
      }

      // Calculate writing fluency (words per minute)
      function calculateWritingFluency() {
        let totalWords = 0;
        let totalTimeMinutes = 0;

        answers.forEach((answer) => {
          totalWords += countWords(answer.userResponse);
          totalTimeMinutes += answer.timeSpent / 60000; // Convert to minutes
        });

        return totalTimeMinutes > 0
          ? Math.round(totalWords / totalTimeMinutes)
          : 0;
      }

      // Determine topic difficulty based on complexity
      function determineDifficulty(question) {
        let difficulty = 1; // Base difficulty (Easy)

        const topic = question.topic.toLowerCase();
        const sampleAnswer = question.results.sampleAnswer.toLowerCase();

        // Abstract or complex topics
        if (
          topic.includes("explain") ||
          topic.includes("analyze") ||
          topic.includes("compare") ||
          topic.includes("discuss")
        ) {
          difficulty += 1;
        }

        // Topics requiring personal experience or opinion
        if (
          topic.includes("favorite") ||
          topic.includes("describe") ||
          topic.includes("your") ||
          topic.includes("you")
        ) {
          difficulty += 0.5;
        }

        // Topics requiring detailed examples
        if (
          topic.includes("example") ||
          topic.includes("specific") ||
          topic.includes("detail") ||
          topic.includes("reason")
        ) {
          difficulty += 0.5;
        }

        // Sample answer complexity indicates difficulty
        const sampleWords = countWords(question.results.sampleAnswer);
        const sampleSentences = question.results.sampleAnswer
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0).length;

        if (sampleWords > 120 || sampleSentences > 8) {
          difficulty += 0.5;
        } else if (sampleWords > 80 || sampleSentences > 6) {
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
          easy: { responses: [], totalTime: 0, wordCounts: [] },
          medium: { responses: [], totalTime: 0, wordCounts: [] },
          hard: { responses: [], totalTime: 0, wordCounts: [] },
        };

        // Analyze performance by difficulty
        answers.forEach((answer, index) => {
          const difficulty = determineDifficulty(quizData[index]);
          const wordCount = countWords(answer.userResponse);

          difficultyStats[difficulty].responses.push(
            answer.userResponse.length
          );
          difficultyStats[difficulty].wordCounts.push(wordCount);
          difficultyStats[difficulty].totalTime += answer.timeSpent;
        });

        // Calculate weighted score based on difficulty handling
        let weightedScore = 0;
        let totalWeight = 0;

        Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
          if (stats.responses.length > 0) {
            const avgLength =
              stats.responses.reduce((sum, len) => sum + len, 0) /
              stats.responses.length;
            const avgWords =
              stats.wordCounts.reduce((sum, words) => sum + words, 0) /
              stats.wordCounts.length;
            const avgTime = stats.totalTime / stats.responses.length;

            // Score based on response adequacy for difficulty level
            let difficultyScore = 50; // Base score

            // Word count bonus (more important for harder topics)
            const expectedWords =
              difficulty === "easy" ? 60 : difficulty === "medium" ? 80 : 100;
            const wordsRatio = Math.min(avgWords / expectedWords, 1.2); // Allow some bonus for exceeding
            difficultyScore += wordsRatio * 30;

            // Time utilization bonus (using most of the 5 minutes is good)
            const expectedTime = 250000; // ~4 minutes in milliseconds (leaving some buffer)
            const timeUtilization = Math.min(avgTime / expectedTime, 1);
            if (timeUtilization > 0.7) {
              difficultyScore += 20;
            } else if (timeUtilization > 0.5) {
              difficultyScore += 10;
            }

            const weight =
              difficulty === "easy" ? 1 : difficulty === "medium" ? 1.5 : 2;
            weightedScore += difficultyScore * weight;
            totalWeight += weight;
          }
        });

        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
      }

      // Calculate writing quality based on response characteristics
      function calculateWritingQuality(responses = answers) {
        if (!responses || responses.length === 0) return 0;

        const response = responses[0].userResponse.trim();
        if (response.length < 20) return 0;

        let responseScore = 0;

        // Length score (optimal range for 5-minute writing: 200-500 characters)
        const length = response.length;
        if (length >= 200 && length <= 600) {
          responseScore += 25;
        } else if (length >= 100 && length < 200) {
          responseScore += 15;
        } else if (length > 600) {
          responseScore += 20;
        }

        // Word count score (optimal: 40-120 words for 5 minutes)
        const wordCount = countWords(response);
        if (wordCount >= 40 && wordCount <= 120) {
          responseScore += 25;
        } else if (wordCount >= 20 && wordCount < 40) {
          responseScore += 15;
        } else if (wordCount > 120) {
          responseScore += 20;
        }

        // Sentence structure (check for multiple sentences and variety)
        const sentences = response
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0);
        if (sentences.length >= 4) {
          responseScore += 20;
        } else if (sentences.length >= 2) {
          responseScore += 15;
        }

        // Paragraph structure (check for line breaks indicating paragraphs)
        const paragraphs = response
          .split("\n")
          .filter((p) => p.trim().length > 0);
        if (paragraphs.length >= 2) {
          responseScore += 10;
        }

        // Vocabulary diversity (unique words ratio)
        const words = response.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words.filter((word) => word.length > 2));
        const diversityRatio = uniqueWords.size / words.length;
        if (diversityRatio > 0.7) {
          responseScore += 15;
        } else if (diversityRatio > 0.5) {
          responseScore += 10;
        }

        // Grammar and structure indicators
        if (
          response.includes("the ") ||
          response.includes("a ") ||
          response.includes("an ")
        ) {
          responseScore += 5; // Article usage
        }
        if (
          /\b(because|since|although|however|therefore|moreover)\b/i.test(
            response
          )
        ) {
          responseScore += 10; // Connecting words
        }
        if (
          /\b(first|second|finally|in conclusion|for example)\b/i.test(response)
        ) {
          responseScore += 5; // Organization markers
        }

        return Math.min(responseScore, 100);
      }

      // Calculate final session score
      function calculateSessionScore(sessionData) {
        // Scoring weights for writing sample tasks
        const weights = {
          writingQuality: 0.35, // 35% - Most important for writing
          fluency: 0.2, // 20% - Writing speed and flow
          consistency: 0.15, // 15% - Response consistency
          difficulty: 0.15, // 15% - Handling different topics
          timeManagement: 0.1, // 10% - Using time effectively
          engagement: 0.05, // 5% - Response length and effort
        };

        // Fluency score (words per minute - optimal range: 8-15 WPM for careful writing)
        const fluencyScore = Math.min(
          100,
          (sessionData.writingFluency / 12) * 100
        );

        // Time management score (using most of the available time is good)
        const optimalTime = 240; // 4 minutes (leaving buffer in 5-minute limit)
        const timeRatio = Math.min(sessionData.avgTime / optimalTime, 1.2);
        const timeManagementScore =
          timeRatio > 0.7 ? 100 : timeRatio > 0.5 ? 80 : 60;

        // Engagement score based on response length
        const engagementScore = Math.min(
          100,
          (sessionData.avgResponseLength / 300) * 100
        );

        // Calculate final weighted score
        const finalScore =
          sessionData.writingQuality * weights.writingQuality +
          fluencyScore * weights.fluency +
          sessionData.consistency * weights.consistency +
          sessionData.difficultyScore * weights.difficulty +
          timeManagementScore * weights.timeManagement +
          engagementScore * weights.engagement;

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

        // For writing tasks, we focus on quality and fluency
        const avgWritingQuality =
          allSessions.reduce(
            (sum, session) => sum + session.writingQuality,
            0
          ) / allSessions.length;

        const avgWritingFluency =
          allSessions.reduce(
            (sum, session) => sum + session.writingFluency,
            0
          ) / allSessions.length;

        // Calculate improvement (compare first vs last session)
        const firstSession = allSessions[0];
        const lastSession = allSessions[allSessions.length - 1];
        const improvement =
          lastSession.writingQuality - firstSession.writingQuality;

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
          writingQuality: 0.35,
          fluency: 0.25,
          avgScore: 0.2,
          improvement: 0.15,
          consistency: 0.05,
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100

        const finalSkillScore =
          avgWritingQuality * skillWeights.writingQuality +
          avgWritingFluency * skillWeights.fluency +
          avgSessionScore * skillWeights.avgScore +
          normalizedImprovement * skillWeights.improvement +
          crossSessionConsistency * skillWeights.consistency;

        // Create overall assessment
        const skillAssessment = {
          skillName: skillName,
          lastUpdated: new Date().toISOString(),
          sessionsCompleted: allSessions.length,

          // Performance metrics
          overallWritingQuality: Math.round(avgWritingQuality),
          averageWritingFluency: Math.round(avgWritingFluency),
          averageSessionScore: Math.round(avgSessionScore),
          improvement: Math.round(improvement),
          consistency: Math.round(crossSessionConsistency),

          // Writing-specific metrics
          averageResponseLength: Math.round(
            allSessions.reduce((sum, s) => sum + s.responseLength, 0) /
              allSessions.length
          ),
          averageTimePerResponse: Math.round(
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

        // Check writing quality trend
        const recentSessions = sessions.slice(-3);
        const avgRecentQuality =
          recentSessions.reduce((sum, s) => sum + s.writingQuality, 0) /
          recentSessions.length;
        if (avgRecentQuality >= 80) {
          strongPoints.push("High writing quality in recent sessions");
        }

        // Check writing fluency
        const avgFluency =
          sessions.reduce((sum, s) => sum + s.writingFluency, 0) /
          sessions.length;
        if (avgFluency >= 10) {
          strongPoints.push("Good writing fluency and speed");
        }

        // Check consistency
        const consistencyScores = sessions.map((s) => s.consistency);
        const avgConsistency =
          consistencyScores.reduce((sum, c) => sum + c, 0) /
          consistencyScores.length;
        if (avgConsistency >= 75) {
          strongPoints.push("Consistent response quality across sessions");
        }

        // Check response length
        const avgResponseLength =
          sessions.reduce((sum, s) => sum + s.responseLength, 0) /
          sessions.length;
        if (avgResponseLength >= 250) {
          strongPoints.push("Good response length and detail");
        }

        return strongPoints.length > 0
          ? strongPoints
          : ["Shows improvement potential"];
      }

      // Identify weak points from session data
      function identifyWeakPoints(sessions) {
        const weakPoints = [];

        // Check writing quality
        const recentSessions = sessions.slice(-3);
        const avgRecentQuality =
          recentSessions.reduce((sum, s) => sum + s.writingQuality, 0) /
          recentSessions.length;
        if (avgRecentQuality < 60) {
          weakPoints.push("Writing quality needs improvement");
        }

        // Check writing fluency
        const avgFluency =
          sessions.reduce((sum, s) => sum + s.writingFluency, 0) /
          sessions.length;
        if (avgFluency < 6) {
          weakPoints.push("Try to write more fluently under time pressure");
        }

        // Check response length
        const avgResponseLength =
          sessions.reduce((sum, s) => sum + s.responseLength, 0) /
          sessions.length;
        if (avgResponseLength < 150) {
          weakPoints.push("Try writing longer, more comprehensive responses");
        }

        // Check time utilization
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime < 120) {
          weakPoints.push(
            "Use more of the available time to develop your ideas"
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
          recommendations.push("Focus on writing complete paragraphs");
          recommendations.push("Practice organizing your ideas before writing");
          recommendations.push("Try to use the full 5 minutes available");
        } else if (finalScore < 70) {
          recommendations.push(
            "Work on connecting your ideas with linking words"
          );
          recommendations.push("Try to write more detailed explanations");
          recommendations.push(
            "Practice using a variety of sentence structures"
          );
        } else if (finalScore < 85) {
          recommendations.push("Focus on developing complex arguments");
          recommendations.push("Try to include specific examples and details");
          recommendations.push("Work on writing more sophisticated vocabulary");
        } else {
          recommendations.push(
            "Excellent work! Try tackling more abstract topics"
          );
          recommendations.push("Practice advanced writing techniques");
          recommendations.push("Help others improve their writing skills");
        }

        // Fluency-based recommendations
        const avgFluency =
          sessions.reduce((sum, s) => sum + s.writingFluency, 0) /
          sessions.length;
        if (avgFluency < 8) {
          recommendations.push(
            "Practice timed writing exercises to improve fluency"
          );
        }

        return recommendations;
      }

      function goBack() {
        window.showConfirmDialog("Are you sure you want to exit the quiz?").then(function(confirmed) {
          if (confirmed) {
            if (stagesCompletedThisSession > 0) {
              incrementSkillProgress("Writing Sample", stagesCompletedThisSession);
            }
            window.location.href = "/";
          }
        });
      }

      // Progress Functions
      function incrementSkillProgress(skillName, count = 1) {
        const currentProgress = getCurrentSkillProgress(skillName);
        const newCompleted = Math.min(currentProgress + count, 3);

        const progressData = {
          skill: skillName,
          completed: newCompleted,
          total: 3,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(
          "writingSampleProgress",
          JSON.stringify(progressData)
        );
        console.log(`Progress updated: ${skillName} - ${newCompleted}/3`);
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
        }
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });