// Quiz Data (will be loaded from JSON)
      let allQuizData = [];
      let quizData = [];
      let quizConfig = {};

      // Quiz State
      let currentQuestion = 0;
      let answers = [];
      let questionStartTime = 0;
      let timerInterval;
      let dataLoaded = false;
      let stagesCompletedThisSession = 0;
      let cumulativeCorrect = 0;
      let cumulativeTotal = 0;
      let feedbackAutoAdvanceTimeout = null;
      let writingTimeLimit = 60; // 1 minute in seconds
      let writingTimer;
      let timeRemaining = writingTimeLimit;

      // Configuration
      const QUESTIONS_PER_QUIZ = 3;
      const STAGES_TOTAL = 3;
      const USED_QUESTIONS_KEY = "write_photo_used_questions";

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          // Create mock data for demonstration
          const data = {
            questions: [
              {
                id: 1,
                imageUrl:
                  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=350&q=80",
                sampleAnswer:
                  "This image shows a beautiful golden retriever dog sitting in a grassy field. The dog appears happy and alert, with its tongue slightly out and ears perked up. The background shows green grass and some trees, creating a peaceful outdoor setting. The lighting suggests it's either early morning or late afternoon, giving the scene a warm, golden glow.",
              },
              {
                id: 2,
                imageUrl:
                  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=350&q=80",
                sampleAnswer:
                  "The photograph captures a stunning mountain landscape with snow-capped peaks in the background. In the foreground, there's a pristine alpine lake reflecting the mountains. The scene is framed by evergreen trees on both sides, and the sky shows some wispy clouds. The water is crystal clear and appears very calm, creating perfect reflections of the surrounding scenery.",
              },
              {
                id: 3,
                imageUrl:
                  "https://images.unsplash.com/photo-1544511916-0148ccdeb877?ixlib=rb-4.0.3&auto=format&fit=crop&w=350&q=80",
                sampleAnswer:
                  "This image shows a cozy coffee shop interior with warm lighting. There are wooden tables and chairs arranged throughout the space, with large windows letting in natural light. You can see a coffee counter in the background with various equipment and menu boards. The atmosphere looks welcoming and comfortable, with a few customers seated at different tables, creating a typical café ambiance.",
              },
            ],
            config: {
              title: "Write a description of the image below for 1 minute",
              shuffleQuestions: true,
            },
          };

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

      function initializeQuiz() {
        if (!dataLoaded || quizData.length === 0) {
          showErrorScreen("No quiz data available");
          return;
        }

        currentQuestion = 0;
        answers = [];

        if (quizConfig.title) {
          document.getElementById("questionTitle").textContent =
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

        const question = quizData[currentQuestion];

        // Update progress bar
        updateProgressBar();

        // Set photo
        document.getElementById("photoImage").src = question.imageUrl;

        // Clear textarea
        const textarea = document.getElementById("responseTextarea");
        textarea.value = "";
        textarea.disabled = false;

        // Reset character counter
        updateCharCounter();

        // Reset continue button
        const continueBtn = document.getElementById("continueBtn");
        continueBtn.className = "continue-btn";
        continueBtn.textContent = "CONTINUE";
        continueBtn.style.display = "block";

        // Hide feedback
        document.getElementById("feedbackSection").style.display = "none";
        document.getElementById("questionCard").style.display = "block";

        // Start timers
        startQuestionTimer();
        startWritingTimer();

        // Add textarea event listeners
        textarea.addEventListener("input", handleTextareaInput);
      }

      function handleTextareaInput() {
        updateCharCounter();
        checkContinueButton();
      }

      function updateCharCounter() {
        const textarea = document.getElementById("responseTextarea");
        const charCounter = document.getElementById("charCounter");
        const currentLength = textarea.value.length;
        const maxLength = 500;

        charCounter.textContent = `${currentLength}/${maxLength}`;

        if (currentLength >= maxLength * 0.9) {
          charCounter.classList.add("warning");
        } else {
          charCounter.classList.remove("warning");
        }
      }

      function checkContinueButton() {
        const textarea = document.getElementById("responseTextarea");
        const continueBtn = document.getElementById("continueBtn");

        if (textarea.value.trim().length >= 10) {
          continueBtn.classList.add("active");
        } else {
          continueBtn.classList.remove("active");
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

          if (seconds >= 50) {
            timerElement.classList.add("warning");
          }
        }, 1000);
      }

      function startWritingTimer() {
        timeRemaining = writingTimeLimit;

        writingTimer = setInterval(() => {
          timeRemaining--;

          if (timeRemaining <= 0) {
            clearInterval(writingTimer);
            submitAnswer();
          }
        }, 1000);
      }

      function stopTimers() {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        if (writingTimer) {
          clearInterval(writingTimer);
        }

        document.getElementById("timer").classList.remove("warning");
      }

      function submitAnswer() {
        const continueBtn = document.getElementById("continueBtn");
        const textarea = document.getElementById("responseTextarea");

        if (!continueBtn.classList.contains("active") && timeRemaining > 0) {
          return;
        }

        stopTimers();

        const question = quizData[currentQuestion];
        const userResponse = textarea.value.trim();

        // Disable textarea
        textarea.disabled = true;

        // Store answer
        const timeSpent = Date.now() - questionStartTime;
        answers.push({
          question: question.id,
          userResponse: userResponse,
          sampleAnswer: question.sampleAnswer,
          timeSpent: timeSpent,
        });

        // Hide continue button
        continueBtn.style.display = "none";

        // Show feedback
        showFeedback(question.sampleAnswer);
      }

      function showFeedback(sampleAnswer) {
        clearTimeout(feedbackAutoAdvanceTimeout);
        const feedbackSection = document.getElementById("feedbackSection");
        const sampleAnswerText = document.getElementById("sampleAnswerText");

        sampleAnswerText.textContent = sampleAnswer;
        feedbackSection.style.display = "block";

        playSound("right answer SFX.wav");
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
          document.getElementById("questionCard").style.display = "block";
          document.getElementById("feedbackSection").style.display = "none";

          showQuestion();
        } else {
          showResults();
        }
      }

      function showResults() {
        stagesCompletedThisSession++;
        cumulativeCorrect += quizData.length;
        cumulativeTotal += quizData.length;
        saveDetailedQuizResult("Write About the Photo");

        document.getElementById("questionCard").style.display = "none";
        document.getElementById("feedbackSection").style.display = "none";
        
        const continueBtn = document.getElementById("resultsContinueBtn");
        if (continueBtn) {
          const hasMoreStages = stagesCompletedThisSession < STAGES_TOTAL;
          const hasNextQuiz = typeof getNextQuizUrl === "function" && getNextQuizUrl("Write About the Photo");
          continueBtn.style.display = hasMoreStages || hasNextQuiz ? "inline-block" : "none";
        }
        
        document.getElementById("resultsScreen").style.display = "block";
      }

      function continueToNextStage() {
        if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {
          const nextUrl = getNextQuizUrl("Write About the Photo");
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
        answers = [];
        initializeQuiz();
      }

      function goToPractice() {
        incrementSkillProgress("Write About the Photo", stagesCompletedThisSession);
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
          correctAnswers: quizData.length, // All writing responses are considered "correct"
          accuracy: 100, // Writing tasks are evaluated differently

          // Time analysis
          totalTimeSpent: sessionData.totalTime,
          averageTimePerQuestion: sessionData.avgTime,

          // Performance analysis for writing
          consistency: sessionData.consistency,
          difficultyHandling: sessionData.difficultyScore,
          writingQuality: sessionData.writingQuality,
          responseLength: sessionData.avgResponseLength,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual question details
          questionDetails: answers.map((answer, index) => ({
            questionId: answer.question,
            questionType: "write_about_photo",
            difficulty: determineDifficulty(quizData[index]),
            responseLength: answer.userResponse.length,
            responseWords: countWords(answer.userResponse),
            timeSpent: answer.timeSpent,
            userResponse: answer.userResponse,
            sampleAnswer: answer.sampleAnswer,
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
          0
        );
        const avgTime = totalTime / answers.length;

        // Calculate consistency - how stable response lengths are
        const responseLengths = answers.map(
          (answer) => answer.userResponse.length
        );
        const avgLength =
          responseLengths.reduce((sum, len) => sum + len, 0) /
          responseLengths.length;

        const lengthDeviations = responseLengths.map((len) =>
          Math.abs(len - avgLength)
        );
        const avgDeviation =
          lengthDeviations.reduce((sum, dev) => sum + dev, 0) /
          lengthDeviations.length;
        const consistency = Math.max(0, 100 - (avgDeviation / avgLength) * 100);

        // Calculate difficulty handling score (based on response quality for different image types)
        const difficultyScore = calculateDifficultyHandling();

        // Calculate writing quality score
        const writingQuality = calculateWritingQuality();

        return {
          totalTime: Math.round(totalTime / 1000), // Convert to seconds
          avgTime: Math.round(avgTime / 1000), // Convert to seconds
          consistency: Math.round(consistency),
          difficultyScore: difficultyScore,
          writingQuality: writingQuality,
          avgResponseLength: Math.round(avgLength),
        };
      }

      // Count words in response
      function countWords(text) {
        return text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
      }

      // Determine image difficulty based on complexity
      function determineDifficulty(question) {
        let difficulty = 1; // Base difficulty (Easy)

        // Check image URL for complexity indicators
        const imageUrl = question.imageUrl.toLowerCase();
        const sampleAnswer = question.sampleAnswer.toLowerCase();

        // Complex scenes (business meetings, group activities)
        if (
          sampleAnswer.includes("meeting") ||
          sampleAnswer.includes("group") ||
          sampleAnswer.includes("business") ||
          sampleAnswer.includes("professional")
        ) {
          difficulty += 1;
        }

        // Technical or detailed descriptions
        if (
          sampleAnswer.includes("various") ||
          sampleAnswer.includes("multiple") ||
          sampleAnswer.includes("different") ||
          sampleAnswer.includes("arrangement")
        ) {
          difficulty += 0.5;
        }

        // Outdoor/nature scenes (often more descriptive)
        if (
          sampleAnswer.includes("landscape") ||
          sampleAnswer.includes("mountain") ||
          sampleAnswer.includes("forest") ||
          sampleAnswer.includes("natural")
        ) {
          difficulty += 0.5;
        }

        // Sample answer length indicates complexity
        const sampleWords = countWords(question.sampleAnswer);
        if (sampleWords > 80) {
          difficulty += 0.5;
        } else if (sampleWords > 60) {
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
          easy: { responses: [], totalTime: 0 },
          medium: { responses: [], totalTime: 0 },
          hard: { responses: [], totalTime: 0 },
        };

        // Analyze performance by difficulty
        answers.forEach((answer, index) => {
          const difficulty = determineDifficulty(quizData[index]);
          difficultyStats[difficulty].responses.push(
            answer.userResponse.length
          );
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
            const avgTime = stats.totalTime / stats.responses.length;

            // Score based on response adequacy for difficulty level
            let difficultyScore = 50; // Base score

            // Length bonus (more important for harder images)
            const expectedLength =
              difficulty === "easy" ? 30 : difficulty === "medium" ? 50 : 70;
            const lengthRatio = Math.min(avgLength / expectedLength, 1);
            difficultyScore += lengthRatio * 30;

            // Time efficiency bonus
            const optimalTime = 45000; // 45 seconds in milliseconds
            if (avgTime <= optimalTime * 1.2) {
              difficultyScore += 20;
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
      function calculateWritingQuality() {
        let qualityScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          const response = answer.userResponse.trim();
          if (response.length < 10) return; // Skip very short responses

          let responseScore = 0;
          validResponses++;

          // Length score (optimal range: 40-100 characters)
          const length = response.length;
          if (length >= 40 && length <= 150) {
            responseScore += 25;
          } else if (length >= 20 && length < 40) {
            responseScore += 15;
          } else if (length > 150) {
            responseScore += 20; // Still good but might be too long
          }

          // Word count score
          const wordCount = countWords(response);
          if (wordCount >= 8 && wordCount <= 25) {
            responseScore += 25;
          } else if (wordCount >= 5 && wordCount < 8) {
            responseScore += 15;
          }

          // Sentence structure (simple check for multiple sentences)
          const sentences = response
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
          if (sentences.length >= 2) {
            responseScore += 20;
          } else if (sentences.length === 1 && response.includes(",")) {
            responseScore += 10; // At least some punctuation
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

          // Grammar indicators (basic checks)
          if (
            response.includes("the ") ||
            response.includes("a ") ||
            response.includes("an ")
          ) {
            responseScore += 10; // Article usage
          }
          if (
            /\b(is|are|was|were|have|has|had)\b/.test(response.toLowerCase())
          ) {
            responseScore += 5; // Verb usage
          }

          qualityScore += Math.min(responseScore, 100);
        });

        return validResponses > 0
          ? Math.round(qualityScore / validResponses)
          : 0;
      }

      // Calculate final session score
      function calculateSessionScore(sessionData) {
        // Scoring weights for writing tasks
        const weights = {
          writingQuality: 0.4, // 40% - Most important for writing
          consistency: 0.2, // 20% - Response consistency
          difficulty: 0.2, // 20% - Handling different image types
          efficiency: 0.1, // 10% - Time management
          engagement: 0.1, // 10% - Response length and effort
        };

        // Efficiency score based on time usage
        const optimalTime = 45; // seconds per question
        const timeDiff = Math.abs(sessionData.avgTime - optimalTime);
        const efficiencyScore = Math.max(
          0,
          100 - (timeDiff / optimalTime) * 50
        );

        // Engagement score based on response length
        const engagementScore = Math.min(
          100,
          (sessionData.avgResponseLength / 60) * 100
        );

        // Calculate final weighted score
        const finalScore =
          sessionData.writingQuality * weights.writingQuality +
          sessionData.consistency * weights.consistency +
          sessionData.difficultyScore * weights.difficulty +
          efficiencyScore * weights.efficiency +
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

        // For writing tasks, we focus on quality rather than correctness
        const avgWritingQuality =
          allSessions.reduce(
            (sum, session) => sum + session.writingQuality,
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
          writingQuality: 0.4,
          avgScore: 0.3,
          improvement: 0.2,
          consistency: 0.1,
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100

        const finalSkillScore =
          avgWritingQuality * skillWeights.writingQuality +
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

        // Check consistency
        const consistencyScores = sessions.map((s) => s.consistency);
        const avgConsistency =
          consistencyScores.reduce((sum, c) => sum + c, 0) /
          consistencyScores.length;
        if (avgConsistency >= 75) {
          strongPoints.push("Consistent response quality across sessions");
        }

        // Check response length consistency
        const avgResponseLength =
          sessions.reduce((sum, s) => sum + s.responseLength, 0) /
          sessions.length;
        if (avgResponseLength >= 50) {
          strongPoints.push("Good response length and detail");
        }

        // Check time management
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime <= 50 && avgTime >= 30) {
          strongPoints.push("Good time management");
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

        // Check response length
        const avgResponseLength =
          sessions.reduce((sum, s) => sum + s.responseLength, 0) /
          sessions.length;
        if (avgResponseLength < 30) {
          weakPoints.push("Try writing longer, more detailed responses");
        }

        // Check time management
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime < 20) {
          weakPoints.push(
            "Take more time to think and write detailed responses"
          );
        } else if (avgTime > 55) {
          weakPoints.push("Try to be more efficient with your time");
        }

        // Check consistency
        const sessionScores = sessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        if (scoreStdDev > 15) {
          weakPoints.push("Try to maintain consistent quality across sessions");
        }

        return weakPoints.length > 0
          ? weakPoints
          : ["Keep practicing to maintain progress"];
      }

      // Generate personalized recommendations
      function generateRecommendations(sessions, finalScore) {
        const recommendations = [];

        if (finalScore < 50) {
          recommendations.push("Focus on writing complete sentences");
          recommendations.push("Try to describe what you see in more detail");
          recommendations.push(
            "Practice basic vocabulary for describing images"
          );
        } else if (finalScore < 70) {
          recommendations.push("Work on using more descriptive adjectives");
          recommendations.push(
            "Try to write about different parts of the image"
          );
          recommendations.push(
            "Practice connecting your ideas with linking words"
          );
        } else if (finalScore < 85) {
          recommendations.push("Focus on writing more complex sentences");
          recommendations.push("Try to infer information about the context");
          recommendations.push("Work on using a wider range of vocabulary");
        } else {
          recommendations.push(
            "Excellent work! Try describing emotions and atmosphere"
          );
          recommendations.push(
            "Practice writing about abstract concepts in images"
          );
          recommendations.push("Help others improve their descriptive writing");
        }

        // Time-based recommendations
        const avgTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgTime < 25) {
          recommendations.push(
            "Take more time to plan your response before writing"
          );
        } else if (avgTime > 55) {
          recommendations.push(
            "Practice writing more efficiently under time pressure"
          );
        }

        return recommendations;
      }

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
          "writePhotoProgress",
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

      function goBack() {
        window.showConfirmDialog("Are you sure you want to exit the quiz?").then(function(confirmed) {
          if (confirmed) {
            if (stagesCompletedThisSession > 0) {
              incrementSkillProgress("Write About the Photo", stagesCompletedThisSession);
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
        }
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        loadQuizData();
      });