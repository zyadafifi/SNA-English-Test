// Quiz Data (will be loaded from JSON)
      let allQuizData = [];
      let quizConfig = {};

      // Quiz State
      let currentQuestion = null;
      let currentStep = "prepare"; // prepare, speaking, review, results
      let questionStartTime = 0;
      let timerInterval;
      let prepareTimeout;
      let recordingTimeout;
      let mediaRecorder;
      let recordedChunks = [];
      let recordedBlob = null;
      let speechSynthesis = window.speechSynthesis;
      let currentUtterance = null;
      let sampleAudio = null;
      let recordingAudio = null;
      let isPlayingSample = false;
      let isPlayingRecording = false;
      let dataLoaded = false;
      let stagesCompletedThisSession = 0;
      // Session tracking variables
      let sessionData = {
        questionId: null,
        preparationTime: 0,
        speakingTime: 0,
        totalTime: 0,
        timeUtilized: 0,
        sessionStartTime: 0,
        preparationStartTime: 0,
        speakingStartTime: 0,
      };

      // Create answers array for compatibility with analytics
      let answers = [];
      let quizData = [];
      // Configuration
      const PREPARE_TIME = 15000; // 15 seconds preparation time
      const RECORDING_TIME = 90000; // Will be loaded from JSON

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch("speak about the photo data.json");
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

          if (allQuizData.length === 0) {
            throw new Error("No questions available in the data file.");
          }

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

      // Initialize Quiz (excludeQuestionId: optional ID to exclude when continuing)
      function initializeQuiz(excludeQuestionId) {
        if (!dataLoaded || allQuizData.length === 0) {
          showErrorScreen("No quiz data available");
          return;
        }

        // Select a random question, excluding the one just completed if provided
        let available = allQuizData;
        if (excludeQuestionId != null && allQuizData.length > 1) {
          available = allQuizData.filter((q) => q.id !== excludeQuestionId);
        }
        currentQuestion =
          available[Math.floor(Math.random() * available.length)];

        // Initialize session tracking
        sessionData.questionId = currentQuestion.id;
        sessionData.sessionStartTime = Date.now();
        quizData = [currentQuestion]; // For analytics compatibility

        console.log(`Starting quiz with question ID: ${currentQuestion.id}`);
        showQuestion();
      }

      // Show Question
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

      function showQuestion() {
        currentStep = "prepare";

        // Update progress bar
        updateProgressBar();

        // Reset UI
        resetUI();

        // Set photo
        document.getElementById("photoImage").src = currentQuestion.imageUrl;

        // Set initial state - preparation mode
        document.getElementById("questionTitle").textContent =
          "Prepare to speak about the image below";
        document.getElementById("questionSubtitle").textContent =
          "You will have 90 seconds to speak";
        document.getElementById("timerLabel").textContent = "to prepare";

        // Show record button, hide others
        document.getElementById("recordButton").style.display = "block";
        document.getElementById("audioVisualizer").style.display = "none";
        document.getElementById("continueBtn").style.display = "none";

        // Hide review section and results
        document.getElementById("reviewSection").style.display = "none";
        document.getElementById("resultsScreen").style.display = "none";
        document.getElementById("questionCard").style.display = "flex";

        // Start prepare timer
        startPrepareTimer();
      }

      function resetUI() {
        // Clear timers
        clearInterval(timerInterval);
        clearTimeout(prepareTimeout);
        clearTimeout(recordingTimeout);

        // Stop any playing audio
        stopAllAudio();

        // Reset record button
        const recordButton = document.getElementById("recordButton");
        recordButton.classList.remove("recording");
        recordButton.style.display = "block";

        // Hide audio visualizer and continue button initially
        document.getElementById("audioVisualizer").style.display = "none";
        document.getElementById("continueBtn").style.display = "none";

        // Reset timer
        document.getElementById("timer").classList.remove("warning");

        // Stop any recording
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }

        // Reset recorded data
        recordedChunks = [];
        recordedBlob = null;
      }

      function startPrepareTimer() {
        questionStartTime = Date.now();
        sessionData.preparationStartTime = Date.now();
        let seconds = 0;
        const maxSeconds = PREPARE_TIME / 1000; // 15 seconds

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;

          const timerElement = document.getElementById("timer");
          const timerText = document.getElementById("timerText");

          timerText.textContent = `${minutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;

          // Warning color after 10 seconds
          if (seconds >= 10) {
            timerElement.classList.add("warning");
          }

          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            // Auto start recording after 15 seconds
            startRecording();
          }
        }, 1000);

        // Set timeout to auto-start recording after 15 seconds
        prepareTimeout = setTimeout(() => {
          startRecording();
        }, PREPARE_TIME);
      }

      async function startRecording() {
        currentStep = "speaking";

        // Record preparation time
        sessionData.preparationTime =
          Date.now() - sessionData.preparationStartTime;
        sessionData.speakingStartTime = Date.now();

        // Update UI for recording mode
        document.getElementById("questionTitle").textContent =
          "Speak about the image below";
        document.getElementById("questionSubtitle").textContent =
          "You have 90 seconds to speak";
        document.getElementById("recordButton").style.display = "none";
        document.getElementById("audioVisualizer").style.display = "flex";
        document.getElementById("continueBtn").style.display = "block";

        // Start recording timer
        startRecordingTimer();

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mediaRecorder = new MediaRecorder(stream);
          recordedChunks = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            recordedBlob = new Blob(recordedChunks, { type: "audio/wav" });
            stream.getTracks().forEach((track) => track.stop());

            // Record speaking time
            sessionData.speakingTime =
              Date.now() - sessionData.speakingStartTime;
            sessionData.totalTime = Date.now() - sessionData.sessionStartTime;

            // Calculate time utilization
            const maxSpeakingTime = (quizConfig.speakingTime || 90) * 1000;
            sessionData.timeUtilized = Math.round(
              (sessionData.speakingTime / maxSpeakingTime) * 100
            );

            // Create answer object for analytics
            const answerData = {
              questionId: sessionData.questionId,
              preparationTime: sessionData.preparationTime,
              speakingTime: sessionData.speakingTime,
              totalTime: sessionData.totalTime,
              timeUtilized: sessionData.timeUtilized,
              sampleAnswer: currentQuestion.sampleAnswer,
            };

            answers = [answerData]; // Single answer array for analytics
          };

          mediaRecorder.start();
          console.log("Recording started");
        } catch (error) {
          console.error("Error starting recording:", error);
          alert("Could not access microphone. Please check permissions.");
        }
      }

      function startRecordingTimer() {
        let seconds = 0;
        const maxSeconds = quizConfig.speakingTime || 90; // Convert to seconds

        document.getElementById("timerLabel").textContent = "to speak";
        document.getElementById("timer").classList.remove("warning");

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;

          const timerElement = document.getElementById("timer");
          const timerText = document.getElementById("timerText");

          timerText.textContent = `${minutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;

          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            stopRecording();
          }
        }, 1000);

        // Set timeout to auto-stop recording
        recordingTimeout = setTimeout(() => {
          stopRecording();
        }, (quizConfig.speakingTime || 90) * 1000);
      }

      function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }

        clearInterval(timerInterval);
        clearTimeout(recordingTimeout);

        // Hide audio visualizer
        document.getElementById("audioVisualizer").style.display = "none";

        console.log("Recording stopped");
      }
      // Calculate session metrics for single question
      function calculateSingleQuestionMetrics() {
        if (answers.length === 0) {
          return {
            totalTime: 0,
            avgTime: 0,
            consistency: 100,
            difficultyScore: 50,
            speakingFluency: 50,
            contentQuality: 50,
            timeUtilization: 0,
            preparationEfficiency: 50,
          };
        }

        const answer = answers[0];

        // Calculate speaking fluency
        const speakingTimeSeconds = answer.speakingTime / 1000;
        let speakingFluency = 50;

        if (speakingTimeSeconds >= 70 && speakingTimeSeconds <= 90) {
          speakingFluency = 90;
        } else if (speakingTimeSeconds >= 50 && speakingTimeSeconds < 70) {
          speakingFluency = 75;
        } else if (speakingTimeSeconds >= 30 && speakingTimeSeconds < 50) {
          speakingFluency = 60;
        }

        // Calculate content quality based on speaking time
        let contentQuality = 50;
        if (speakingTimeSeconds >= 60) {
          contentQuality = 80;
        } else if (speakingTimeSeconds >= 40) {
          contentQuality = 65;
        }

        // Calculate preparation efficiency
        const prepTimeSeconds = answer.preparationTime / 1000;
        let preparationEfficiency = 50;
        if (prepTimeSeconds >= 8 && prepTimeSeconds <= 12) {
          preparationEfficiency = 100;
        } else if (prepTimeSeconds >= 5 && prepTimeSeconds <= 15) {
          preparationEfficiency = 80;
        }

        return {
          totalTime: Math.round(answer.totalTime / 1000),
          avgTime: Math.round(answer.totalTime / 1000),
          consistency: 100, // Single question, perfect consistency
          difficultyScore: 75, // Default for single question
          speakingFluency: speakingFluency,
          contentQuality: contentQuality,
          timeUtilization: answer.timeUtilized,
          preparationEfficiency: preparationEfficiency,
        };
      }
      function handleRecord() {
        if (currentStep === "prepare") {
          // User clicked record button during preparation
          clearTimeout(prepareTimeout);
          clearInterval(timerInterval);
          startRecording();
        }
      }

      function nextStep() {
        if (currentStep === "speaking") {
          stopRecording();
          showReview();
        }
      }

      function showReview() {
        currentStep = "review";

        // Keep question card visible but hide the continue button
        document.getElementById("continueBtn").style.display = "none";

        // Hide audio visualizer since recording is done
        document.getElementById("audioVisualizer").style.display = "none";

        // Show review section
        document.getElementById("reviewSection").style.display = "block";
      }

      function stopAllAudio() {
        // Stop text-to-speech
        if (speechSynthesis) {
          speechSynthesis.cancel();
        }

        // Stop sample audio
        if (sampleAudio) {
          sampleAudio.pause();
          sampleAudio.currentTime = 0;
        }

        // Stop recording audio
        if (recordingAudio) {
          recordingAudio.pause();
          recordingAudio.currentTime = 0;
        }

        // Reset button states
        resetAudioButtons();

        isPlayingSample = false;
        isPlayingRecording = false;
      }

      function resetAudioButtons() {
        // Reset sample button
        const sampleBtn = document.getElementById("sampleBtn");
        const samplePlayIcon = document.getElementById("samplePlayIcon");
        const sampleStopIcon = document.getElementById("sampleStopIcon");
        const sampleBtnText = document.getElementById("sampleBtnText");

        if (sampleBtn) {
          sampleBtn.classList.remove("playing");
          samplePlayIcon.style.display = "block";
          sampleStopIcon.style.display = "none";
          sampleBtnText.textContent = "SAMPLE";
        }

        // Reset recording button
        const recordingBtn = document.getElementById("recordingBtn");
        const recordingPlayIcon = document.getElementById("recordingPlayIcon");
        const recordingStopIcon = document.getElementById("recordingStopIcon");
        const recordingBtnText = document.getElementById("recordingBtnText");

        if (recordingBtn) {
          recordingBtn.classList.remove("playing");
          recordingPlayIcon.style.display = "block";
          recordingStopIcon.style.display = "none";
          recordingBtnText.textContent = "YOUR RECORDING";
        }
      }

      function toggleSample() {
        if (isPlayingSample) {
          stopAllAudio();
        } else {
          stopAllAudio();
          playSample();
        }
      }

      function playSample() {
        if (!speechSynthesis) {
          alert("Text-to-speech is not supported in your browser");
          return;
        }

        try {
          isPlayingSample = true;

          // Update button appearance
          const sampleBtn = document.getElementById("sampleBtn");
          const samplePlayIcon = document.getElementById("samplePlayIcon");
          const sampleStopIcon = document.getElementById("sampleStopIcon");
          const sampleBtnText = document.getElementById("sampleBtnText");

          sampleBtn.classList.add("playing");
          samplePlayIcon.style.display = "none";
          sampleStopIcon.style.display = "block";
          sampleBtnText.textContent = "STOP";

          // Create utterance
          currentUtterance = new SpeechSynthesisUtterance(
            currentQuestion.sampleAnswer
          );

          // Configure speech
          currentUtterance.rate = 0.9;
          currentUtterance.pitch = 1.0;
          currentUtterance.volume = 0.8;

          // Try to use an English voice
          const voices = speechSynthesis.getVoices();
          const englishVoice =
            voices.find(
              (voice) =>
                voice.lang.startsWith("en") && !voice.name.includes("Google")
            ) || voices.find((voice) => voice.lang.startsWith("en"));

          if (englishVoice) {
            currentUtterance.voice = englishVoice;
          }

          // Handle speech end
          currentUtterance.onend = () => {
            isPlayingSample = false;
            resetAudioButtons();
          };

          currentUtterance.onerror = () => {
            isPlayingSample = false;
            resetAudioButtons();
          };

          // Speak the text
          speechSynthesis.speak(currentUtterance);
        } catch (error) {
          console.error("Error with text-to-speech:", error);
          alert("Error playing sample audio");
          isPlayingSample = false;
          resetAudioButtons();
        }
      }

      function toggleRecording() {
        if (isPlayingRecording) {
          stopAllAudio();
        } else {
          stopAllAudio();
          playRecording();
        }
      }

      function playRecording() {
        if (!recordedBlob) {
          alert("No recording available");
          return;
        }

        try {
          isPlayingRecording = true;

          // Update button appearance
          const recordingBtn = document.getElementById("recordingBtn");
          const recordingPlayIcon =
            document.getElementById("recordingPlayIcon");
          const recordingStopIcon =
            document.getElementById("recordingStopIcon");
          const recordingBtnText = document.getElementById("recordingBtnText");

          recordingBtn.classList.add("playing");
          recordingPlayIcon.style.display = "none";
          recordingStopIcon.style.display = "block";
          recordingBtnText.textContent = "STOP";

          const audioUrl = URL.createObjectURL(recordedBlob);
          recordingAudio = document.getElementById("recordingAudio");
          recordingAudio.src = audioUrl;

          recordingAudio.onended = () => {
            isPlayingRecording = false;
            resetAudioButtons();
            URL.revokeObjectURL(audioUrl);
          };

          recordingAudio.onerror = () => {
            isPlayingRecording = false;
            resetAudioButtons();
            URL.revokeObjectURL(audioUrl);
          };

          recordingAudio.play();
        } catch (error) {
          console.error("Error playing recording:", error);
          alert("Error playing your recording");
          isPlayingRecording = false;
          resetAudioButtons();
        }
      }

      function showResults() {
        stagesCompletedThisSession++;
        saveDetailedQuizResult("Speak About the Photo");

        stopAllAudio();
        document.getElementById("questionCard").style.display = "none";
        document.getElementById("reviewSection").style.display = "none";
        document.getElementById("resultsScreen").style.display = "block";
      }

      function continueToNextStage() {
        if (stagesCompletedThisSession >= STAGES_TOTAL && typeof getNextQuizUrl === "function") {
          const nextUrl = getNextQuizUrl("Speak About the Photo");
          if (nextUrl) {
            window.location.href = nextUrl;
            return;
          }
        }
        const completedId = currentQuestion?.id;
        resetUI();
        document.getElementById("resultsScreen").style.display = "none";
        document.getElementById("questionCard").style.display = "flex";
        initializeQuiz(completedId);
      }

      // Go to Practice Page
      function goToPractice() {
        stopAllAudio();
        incrementSkillProgress("Speak About the Photo", stagesCompletedThisSession);
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
          correctAnswers: quizData.length, // All speaking responses are considered "completed"
          accuracy: 100, // Speaking tasks are evaluated differently

          // Time analysis
          totalTimeSpent: sessionData.totalTime,
          averageTimePerQuestion: sessionData.avgTime,

          // Performance analysis for speaking
          consistency: sessionData.consistency,
          difficultyHandling: sessionData.difficultyScore,
          speakingFluency: sessionData.speakingFluency,
          contentQuality: sessionData.contentQuality,
          timeUtilization: sessionData.timeUtilization,
          preparationEfficiency: sessionData.preparationEfficiency,

          // Final session score
          sessionScore: calculateSessionScore(sessionData),

          // Individual question details
          questionDetails: answers.map((answer, index) => ({
            questionId: answer.questionId,
            questionType: "speak_about_photo",
            difficulty: determinePhotoDifficulty(quizData[index]),
            speakingTime: answer.speakingTime,
            preparationTime: answer.preparationTime,
            totalTime: answer.totalTime,
            timeUtilized: answer.timeUtilized,
            imageType: categorizeImageType(quizData[index]),
            sampleAnswer: answer.sampleAnswer,
            expectedElements: extractExpectedElements(
              quizData[index].sampleAnswer
            ),
          })),
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);
        console.log(`Session saved for ${skillName}:`, sessionResult);
      }

      // Calculate session metrics specific to speaking tasks
      function calculateSessionMetrics() {
        return calculateSingleQuestionMetrics();
      }

      // Determine photo difficulty based on visual complexity
      function determinePhotoDifficulty(question) {
        let difficulty = 1; // Base difficulty (Easy)

        const imageUrl = question.imageUrl.toLowerCase();
        const sampleAnswer = question.sampleAnswer.toLowerCase();

        // Analyze sample answer complexity
        const sampleWords = question.sampleAnswer.split(" ").length;
        const sampleSentences = question.sampleAnswer
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0).length;

        // Length-based complexity
        if (sampleWords > 80 || sampleSentences > 6) {
          difficulty += 1; // Complex descriptions
        } else if (sampleWords > 60 || sampleSentences > 4) {
          difficulty += 0.5; // Medium complexity
        }

        // Visual complexity indicators from sample answer
        const complexElements = [
          "multiple",
          "various",
          "different",
          "several",
          "many",
          "background",
          "foreground",
          "detail",
          "texture",
          "pattern",
        ];
        const hasComplexElements = complexElements.some((element) =>
          sampleAnswer.includes(element)
        );
        if (hasComplexElements) {
          difficulty += 0.5;
        }

        // Scene type complexity
        const sceneTypes = {
          nature: ["forest", "mountain", "tree", "landscape", "natural"],
          urban: ["building", "city", "street", "traffic", "urban"],
          people: ["person", "people", "group", "family", "individual"],
          indoor: ["room", "kitchen", "office", "indoor", "interior"],
          action: ["running", "walking", "working", "playing", "activity"],
        };

        // People and action scenes are typically more complex to describe
        if (
          sceneTypes.people.some((word) => sampleAnswer.includes(word)) ||
          sceneTypes.action.some((word) => sampleAnswer.includes(word))
        ) {
          difficulty += 0.5;
        }

        // Technical or specific vocabulary
        const technicalTerms = [
          "equipment",
          "professional",
          "technical",
          "specific",
          "particular",
        ];
        if (technicalTerms.some((term) => sampleAnswer.includes(term))) {
          difficulty += 0.3;
        }

        // Clamp difficulty between 1-3
        difficulty = Math.max(1, Math.min(3, difficulty));

        if (difficulty <= 1.5) return "easy";
        if (difficulty <= 2.5) return "medium";
        return "hard";
      }

      // Categorize image type for analysis
      function categorizeImageType(question) {
        const sampleAnswer = question.sampleAnswer.toLowerCase();

        if (
          sampleAnswer.includes("forest") ||
          sampleAnswer.includes("tree") ||
          sampleAnswer.includes("natural")
        ) {
          return "nature";
        } else if (
          sampleAnswer.includes("mountain") ||
          sampleAnswer.includes("landscape")
        ) {
          return "landscape";
        } else if (
          sampleAnswer.includes("building") ||
          sampleAnswer.includes("city")
        ) {
          return "urban";
        } else if (
          sampleAnswer.includes("people") ||
          sampleAnswer.includes("person")
        ) {
          return "people";
        } else if (
          sampleAnswer.includes("room") ||
          sampleAnswer.includes("indoor")
        ) {
          return "indoor";
        }

        return "general";
      }

      // Extract expected elements from sample answer
      function extractExpectedElements(sampleAnswer) {
        const elements = [];
        const words = sampleAnswer.toLowerCase().split(" ");

        // Key visual elements
        const visualElements = [
          "color",
          "light",
          "shadow",
          "texture",
          "size",
          "shape",
        ];
        const objectElements = [
          "tree",
          "building",
          "person",
          "car",
          "table",
          "chair",
        ];
        const descriptiveElements = [
          "beautiful",
          "large",
          "small",
          "bright",
          "dark",
          "clean",
        ];

        visualElements.forEach((element) => {
          if (words.includes(element)) elements.push(element);
        });

        objectElements.forEach((element) => {
          if (words.includes(element)) elements.push(element);
        });

        descriptiveElements.forEach((element) => {
          if (words.includes(element)) elements.push(element);
        });

        return elements;
      }

      // Calculate how well user handles different difficulty levels
      function calculateDifficultyHandling() {
        const difficultyStats = {
          easy: { responses: 0, totalTime: 0, avgUtilization: 0 },
          medium: { responses: 0, totalTime: 0, avgUtilization: 0 },
          hard: { responses: 0, totalTime: 0, avgUtilization: 0 },
        };

        // Analyze performance by difficulty
        answers.forEach((answer, index) => {
          const difficulty = determinePhotoDifficulty(quizData[index]);
          difficultyStats[difficulty].responses++;
          difficultyStats[difficulty].totalTime += answer.speakingTime;
          difficultyStats[difficulty].avgUtilization += answer.timeUtilized;
        });

        // Calculate weighted score based on difficulty handling
        let weightedScore = 0;
        let totalWeight = 0;

        Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
          if (stats.responses > 0) {
            const avgTime = stats.totalTime / stats.responses;
            const avgUtilization = stats.avgUtilization / stats.responses;

            // Score based on appropriate time usage for difficulty level
            let difficultyScore = 50; // Base score

            // Time utilization bonus (using most of available time is good)
            if (avgUtilization > 70) {
              difficultyScore += 30;
            } else if (avgUtilization > 50) {
              difficultyScore += 20;
            } else if (avgUtilization > 30) {
              difficultyScore += 10;
            }

            // Consistency bonus for appropriate speaking time
            const expectedTime =
              difficulty === "easy"
                ? 60000
                : difficulty === "medium"
                ? 75000
                : 85000; // milliseconds
            if (Math.abs(avgTime - expectedTime) < expectedTime * 0.2) {
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

      // Calculate speaking fluency based on time patterns
      function calculateSpeakingFluency() {
        let fluencyScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          validResponses++;
          let responseScore = 0;

          // Time utilization score (using 70-95% of available time is optimal)
          const utilization = answer.timeUtilized;
          if (utilization >= 70 && utilization <= 95) {
            responseScore += 40;
          } else if (utilization >= 50 && utilization < 70) {
            responseScore += 25;
          } else if (utilization > 95) {
            responseScore += 35; // Good but might be rushed at the end
          }

          // Consistency in speaking time (not too much variation)
          const speakingTimeSeconds = answer.speakingTime / 1000;
          if (speakingTimeSeconds >= 60 && speakingTimeSeconds <= 85) {
            responseScore += 30;
          } else if (speakingTimeSeconds >= 45 && speakingTimeSeconds <= 60) {
            responseScore += 20;
          }

          // Preparation vs speaking time balance
          const prepRatio =
            answer.preparationTime /
            (answer.preparationTime + answer.speakingTime);
          if (prepRatio >= 0.1 && prepRatio <= 0.2) {
            // 10-20% preparation time is good
            responseScore += 20;
          } else if (prepRatio >= 0.05 && prepRatio <= 0.25) {
            responseScore += 10;
          }

          // Timing efficiency (not running over time limits)
          if (answer.speakingTime <= 92000) {
            // Within 92 seconds (allowing small buffer)
            responseScore += 10;
          }

          fluencyScore += Math.min(responseScore, 100);
        });

        return validResponses > 0
          ? Math.round(fluencyScore / validResponses)
          : 0;
      }

      // Calculate estimated content quality based on speaking patterns
      function calculateContentQuality() {
        let qualityScore = 0;
        let validResponses = 0;

        answers.forEach((answer, index) => {
          validResponses++;
          let responseScore = 50; // Base score

          // Length appropriateness (longer speaking generally indicates more content)
          const speakingTimeSeconds = answer.speakingTime / 1000;
          if (speakingTimeSeconds >= 70 && speakingTimeSeconds <= 90) {
            responseScore += 25; // Optimal length
          } else if (speakingTimeSeconds >= 50 && speakingTimeSeconds < 70) {
            responseScore += 15; // Good length
          } else if (speakingTimeSeconds >= 30 && speakingTimeSeconds < 50) {
            responseScore += 5; // Short but acceptable
          }

          // Preparation time usage (good preparation usually leads to better content)
          const prepTimeSeconds = answer.preparationTime / 1000;
          if (prepTimeSeconds >= 8 && prepTimeSeconds <= 15) {
            responseScore += 15; // Good preparation time
          } else if (prepTimeSeconds >= 5 && prepTimeSeconds < 8) {
            responseScore += 10; // Some preparation
          }

          // Difficulty bonus (speaking well about complex images deserves more points)
          const difficulty = determinePhotoDifficulty(quizData[index]);
          if (difficulty === "hard" && speakingTimeSeconds >= 60) {
            responseScore += 10;
          } else if (difficulty === "medium" && speakingTimeSeconds >= 45) {
            responseScore += 5;
          }

          qualityScore += Math.min(responseScore, 100);
        });

        return validResponses > 0
          ? Math.round(qualityScore / validResponses)
          : 0;
      }

      // Calculate time utilization efficiency
      function calculateTimeUtilization() {
        const totalUtilization = answers.reduce(
          (sum, answer) => sum + answer.timeUtilized,
          0
        );
        return answers.length > 0
          ? Math.round(totalUtilization / answers.length)
          : 0;
      }

      // Calculate preparation efficiency
      function calculatePreparationEfficiency() {
        let efficiencyScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          validResponses++;
          const prepTime = answer.preparationTime / 1000; // Convert to seconds

          // Optimal preparation time is 8-12 seconds
          if (prepTime >= 8 && prepTime <= 12) {
            efficiencyScore += 100;
          } else if (prepTime >= 5 && prepTime <= 15) {
            efficiencyScore += 80;
          } else if (prepTime >= 3 && prepTime <= 18) {
            efficiencyScore += 60;
          } else {
            efficiencyScore += 40; // Too little or too much preparation
          }
        });

        return validResponses > 0
          ? Math.round(efficiencyScore / validResponses)
          : 0;
      }

      // Calculate final session score
      function calculateSessionScore(sessionData) {
        // Scoring weights for speaking tasks
        const weights = {
          speakingFluency: 0.3, // 30% - Most important for speaking
          contentQuality: 0.25, // 25% - Quality of content
          timeUtilization: 0.2, // 20% - Using available time well
          preparationEfficiency: 0.1, // 10% - Good preparation
          consistency: 0.1, // 10% - Consistent performance
          difficulty: 0.05, // 5% - Handling complex images
        };

        // Calculate final weighted score
        const finalScore =
          sessionData.speakingFluency * weights.speakingFluency +
          sessionData.contentQuality * weights.contentQuality +
          sessionData.timeUtilization * weights.timeUtilization +
          sessionData.preparationEfficiency * weights.preparationEfficiency +
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

        // Calculate overall metrics for speaking
        const avgSpeakingFluency =
          allSessions.reduce(
            (sum, session) => sum + session.speakingFluency,
            0
          ) / allSessions.length;

        const avgContentQuality =
          allSessions.reduce(
            (sum, session) => sum + session.contentQuality,
            0
          ) / allSessions.length;

        const avgTimeUtilization =
          allSessions.reduce(
            (sum, session) => sum + session.timeUtilization,
            0
          ) / allSessions.length;

        // Calculate improvement (compare first vs last session)
        const firstSession = allSessions[0];
        const lastSession = allSessions[allSessions.length - 1];
        const improvement =
          lastSession.speakingFluency - firstSession.speakingFluency;

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
          speakingFluency: 0.35,
          contentQuality: 0.25,
          timeUtilization: 0.2,
          avgScore: 0.15,
          improvement: 0.05,
        };

        const normalizedImprovement = Math.max(
          0,
          Math.min(100, improvement + 50)
        ); // Normalize to 0-100

        const finalSkillScore =
          avgSpeakingFluency * skillWeights.speakingFluency +
          avgContentQuality * skillWeights.contentQuality +
          avgTimeUtilization * skillWeights.timeUtilization +
          avgSessionScore * skillWeights.avgScore +
          normalizedImprovement * skillWeights.improvement;

        // Create overall assessment
        const skillAssessment = {
          skillName: skillName,
          lastUpdated: new Date().toISOString(),
          sessionsCompleted: allSessions.length,

          // Performance metrics
          averageSpeakingFluency: Math.round(avgSpeakingFluency),
          averageContentQuality: Math.round(avgContentQuality),
          averageTimeUtilization: Math.round(avgTimeUtilization),
          averageSessionScore: Math.round(avgSessionScore),
          improvement: Math.round(improvement),
          consistency: Math.round(crossSessionConsistency),

          // Speaking-specific metrics
          averagePreparationEfficiency: Math.round(
            allSessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
              allSessions.length
          ),
          averageSpeakingTime: Math.round(
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

        // Check speaking fluency
        const avgSpeakingFluency =
          sessions.reduce((sum, s) => sum + s.speakingFluency, 0) /
          sessions.length;
        if (avgSpeakingFluency >= 80) {
          strongPoints.push("Excellent speaking fluency");
        }

        // Check content quality
        const avgContentQuality =
          sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
          sessions.length;
        if (avgContentQuality >= 75) {
          strongPoints.push("High quality content in descriptions");
        }

        // Check time utilization
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization >= 80) {
          strongPoints.push("Excellent time management");
        }

        // Check preparation efficiency
        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency >= 85) {
          strongPoints.push("Efficient preparation before speaking");
        }

        // Check consistency
        const sessionScores = sessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        if (scoreStdDev <= 10) {
          strongPoints.push("Consistent performance across sessions");
        }

        return strongPoints.length > 0
          ? strongPoints
          : ["Shows improvement potential"];
      }

      // Identify weak points from session data
      function identifyWeakPoints(sessions) {
        const weakPoints = [];

        // Check speaking fluency
        const avgSpeakingFluency =
          sessions.reduce((sum, s) => sum + s.speakingFluency, 0) /
          sessions.length;
        if (avgSpeakingFluency < 60) {
          weakPoints.push("Speaking fluency needs improvement");
        }

        // Check content quality
        const avgContentQuality =
          sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
          sessions.length;
        if (avgContentQuality < 65) {
          weakPoints.push("Focus on providing more detailed descriptions");
        }

        // Check time utilization
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization < 60) {
          weakPoints.push("Try to use more of the available speaking time");
        } else if (avgTimeUtilization > 98) {
          weakPoints.push("Practice pacing to avoid rushing at the end");
        }

        // Check preparation efficiency
        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency < 70) {
          weakPoints.push("Improve preparation time management");
        }

        return weakPoints.length > 0
          ? weakPoints
          : ["Keep practicing to maintain progress"];
      }

      // Generate personalized recommendations
      function generateRecommendations(sessions, finalScore) {
        const recommendations = [];

        if (finalScore < 50) {
          recommendations.push("Practice describing simple images first");
          recommendations.push(
            "Use the full preparation time to organize thoughts"
          );
          recommendations.push("Focus on basic descriptive vocabulary");
        } else if (finalScore < 70) {
          recommendations.push("Work on speaking for the full time available");
          recommendations.push("Practice describing details and context");
          recommendations.push("Try to organize descriptions logically");
        } else if (finalScore < 85) {
          recommendations.push("Challenge yourself with complex images");
          recommendations.push("Practice advanced descriptive techniques");
          recommendations.push("Work on fluency and natural speech patterns");
        } else {
          recommendations.push(
            "Excellent work! Try describing abstract concepts"
          );
          recommendations.push("Practice with professional or artistic images");
          recommendations.push("Help others improve their speaking skills");
        }

        // Specific recommendations based on metrics
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization < 70) {
          recommendations.push(
            "Practice speaking for the full 90 seconds available"
          );
        }

        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency < 75) {
          recommendations.push(
            "Use preparation time more effectively to plan your description"
          );
        }

        return recommendations;
      }
      // Function to increment progress by 1
      function incrementSkillProgress(skillName, count = 1) {
        // Get current progress first
        const currentProgress = getCurrentSkillProgress(skillName);
        const newCompleted = Math.min(currentProgress + count, 3); // Don't exceed 3

        const progressData = {
          skill: skillName,
          completed: newCompleted,
          total: 3,
          timestamp: new Date().toISOString(),
        };

        try {
          localStorage.setItem(
            "speakPhotoProgress",
            JSON.stringify(progressData)
          );
          console.log(`Progress updated: ${skillName} - ${newCompleted}/3`);
        } catch (error) {
          console.error("Error saving progress:", error);
        }
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
              incrementSkillProgress("Speak About the Photo", stagesCompletedThisSession);
            }
            stopAllAudio();
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

      // Handle page unload - stop all audio
      window.addEventListener("beforeunload", function () {
        stopAllAudio();
      });

      window.addEventListener("unload", function () {
        stopAllAudio();
      });

      // Initialize App on Load
      window.addEventListener("load", function () {
        console.log("Speak About the Photo Practice App loading...");

        // Wait for voices to load
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = function () {
            console.log("Voices loaded:", speechSynthesis.getVoices().length);
          };
        }

        loadQuizData();
      });

      console.log(
        "Speak About the Photo Practice App initialized successfully!"
      );