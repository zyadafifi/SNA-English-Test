import { getNextQuizUrl } from './skills-config.legacy.js';
import { getQuizDataUrl } from './quiz-data-url.js';
import { initResultsScreen } from './shared/resultsScreen.js';

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const getNextQuizUrlFn = options.getNextQuizUrl || getNextQuizUrl;
  const unbind = [];
  const STAGES_TOTAL = 3;

// Quiz State
      let allQuizData = [];
      let quizConfig = {};
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
      let sessionStartTime = Date.now();
      let answers = []; // Array to store all responses
      let currentQuestionData = null; // Current question being answered

      // Response timing variables
      let questionPrepStartTime = 0;
      let questionSpeakStartTime = 0;
      let actualPreparationTime = 0;
      let actualSpeakingTime = 0;
      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch(getQuizDataUrl("speaking sample data.json"));
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

      // Initialize Quiz (excludeQuestionId: optional ID to exclude when continuing)
      function initializeQuiz(excludeQuestionId) {
        if (!dataLoaded || allQuizData.length === 0) {
          showErrorScreen("No quiz data available");
          return;
        }

        // Initialize session tracking
        sessionStartTime = Date.now();
        answers = [];

        // Select a random question, excluding the one just completed if provided
        let available = allQuizData;
        if (excludeQuestionId != null && allQuizData.length > 1) {
          available = allQuizData.filter((q) => q.id !== excludeQuestionId);
        }
        currentQuestion =
          available[Math.floor(Math.random() * available.length)];
        showQuestion();
      }

      // Show Question
      // Update Progress Bar
      function updateProgressBar() {
        const completed = 0; // Single question quiz - always 0 until complete
        const total = 1;
        const percentage = 0;
        
        const progressFill = getEl(containerEl, "stageProgressFill");
        const progressText = getEl(containerEl, "stageProgressText");
        
        if (progressFill && progressText) {
          progressFill.style.width = percentage + "%";
          progressText.textContent = completed + "/" + total;
        }
      }

      function showQuestion() {
        currentStep = "prepare";

        // Update progress bar
        updateProgressBar();

        // Initialize question data tracking
        currentQuestionData = {
          questionId: currentQuestion.id,
          topicText: currentQuestion.topicText,
          sampleAnswer: currentQuestion.sampleAnswer,
          startTime: Date.now(),
          preparationStartTime: Date.now(),
        };

        // Reset timing variables
        questionPrepStartTime = Date.now();
        actualPreparationTime = 0;
        actualSpeakingTime = 0;

        resetUI();

        // Set topic content from loaded data
        getEl(containerEl, "topicText").textContent =
          currentQuestion.topicText;

        // Set initial state - preparation mode
        getEl(containerEl, "questionTitle").textContent =
          "Prepare to speak about the topic below";
        const questionSubtitle = getEl(containerEl, "questionSubtitle");
        if (questionSubtitle) {
          questionSubtitle.textContent = "You will have " + quizConfig.speakingTime / 60 + " minutes to speak";
        }
        

        // Show record button, hide others
        const recordButton = getEl(containerEl, "recordButton");
        if (recordButton) recordButton.style.display = "block";
        
        const recordingStatus = getEl(containerEl, "recordingStatus");
        if (recordingStatus) recordingStatus.style.display = "none";
        
        const continueBtn = getEl(containerEl, "continueBtn");
        if (continueBtn) continueBtn.style.display = "none";

        // Hide review section and results
        const reviewSection = getEl(containerEl, "reviewSection");
        if (reviewSection) reviewSection.style.display = "none";
        
        const resultsScreen = getEl(containerEl, "resultsScreen");
        if (resultsScreen) resultsScreen.style.display = "none";
        
        const questionCard = getEl(containerEl, "questionCard");
        if (questionCard) questionCard.style.display = "flex";

        // Start prepare timer
        startPrepareTimer();
      }

      function resetUI() {
        clearInterval(timerInterval);
        clearTimeout(prepareTimeout);
        clearTimeout(recordingTimeout);
        stopAllAudio();

        const recordButton = getEl(containerEl, "recordButton");
        if (recordButton) {
          recordButton.classList.remove("recording");
          recordButton.style.display = "block";
        }

        const recordingStatus = getEl(containerEl, "recordingStatus");
        if (recordingStatus) recordingStatus.style.display = "none";
        
        const continueBtn = getEl(containerEl, "continueBtn");
        if (continueBtn) continueBtn.style.display = "none";
        
        const timer = getEl(containerEl, "timer");
        if (timer) timer.classList.remove("warning");

        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }

        recordedChunks = [];
        recordedBlob = null;
      }

      function startPrepareTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        questionStartTime = Date.now();
        let seconds = 0;
        const maxSeconds = quizConfig.prepareTime || 30;
        const timerText = getEl(containerEl, "timerText");
        if (timerText) timerText.textContent = "0:00";

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            timerInterval = null;
            startRecording();
          }
        }, 1000);

        prepareTimeout = setTimeout(() => {
          startRecording();
        }, (quizConfig.prepareTime || 30) * 1000);
      }

      async function handleRecord() {
        if (currentStep === "prepare") {
          clearTimeout(prepareTimeout);
          clearInterval(timerInterval);
          startRecording();
        }
      }

      async function startRecording() {
        currentStep = "speaking";

        // Track preparation time and start speaking time
        actualPreparationTime = Date.now() - questionPrepStartTime;
        questionSpeakStartTime = Date.now();

        const questionTitle = getEl(containerEl, "questionTitle");
        if (questionTitle) questionTitle.textContent = "Speak about the topic below";
        
        const questionSubtitle = getEl(containerEl, "questionSubtitle");
        if (questionSubtitle) {
          questionSubtitle.textContent = "You have " + quizConfig.speakingTime / 60 + " minutes to speak";
        }
        
        const recordButton = getEl(containerEl, "recordButton");
        if (recordButton) recordButton.style.display = "none";
        
        const recordingStatus = getEl(containerEl, "recordingStatus");
        if (recordingStatus) recordingStatus.style.display = "flex";
        
        const continueBtn = getEl(containerEl, "continueBtn");
        if (continueBtn) {
          continueBtn.style.display = "block";
          continueBtn.classList.remove("active");
        }

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

            // Calculate actual speaking time and save answer data
            actualSpeakingTime = Date.now() - questionSpeakStartTime;
            saveAnswerData();
          };

          mediaRecorder.start();
        } catch (error) {
          console.error("Error starting recording:", error);
          alert("Could not access microphone. Please check permissions.");
        }
      }

      function startRecordingTimer() {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        let seconds = 0;
        const maxSeconds = quizConfig.speakingTime || 180;
        const timer = getEl(containerEl, "timer");
        const timerText = getEl(containerEl, "timerText");
        if (timer) timer.classList.remove("warning");
        if (timerText) timerText.textContent = "0:00";

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (seconds >= (quizConfig.enableContinueAfter || 60)) {
            const continueBtn = getEl(containerEl, "continueBtn");
            if (continueBtn) continueBtn.classList.add("active");
          }
          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            timerInterval = null;
            stopRecording();
          }
        }, 1000);

        recordingTimeout = setTimeout(() => {
          stopRecording();
        }, (quizConfig.speakingTime || 180) * 1000);
      }

      function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }

        clearInterval(timerInterval);
        clearTimeout(recordingTimeout);

        // Calculate actual speaking time if not already calculated
        if (actualSpeakingTime === 0) {
          actualSpeakingTime = Date.now() - questionSpeakStartTime;
          saveAnswerData();
        }

        const recordingStatus = getEl(containerEl, "recordingStatus");
        if (recordingStatus) recordingStatus.style.display = "none";
      }
      function saveAnswerData() {
        const totalTime = actualPreparationTime + actualSpeakingTime;
        const maxSpeakingTime = (quizConfig.speakingTime || 180) * 1000; // Convert to milliseconds
        const timeUtilized = Math.min(
          (actualSpeakingTime / maxSpeakingTime) * 100,
          100
        );

        const answerData = {
          questionId: currentQuestion.id,
          topicText: currentQuestion.topicText,
          sampleAnswer: currentQuestion.sampleAnswer,
          preparationTime: actualPreparationTime,
          speakingTime: actualSpeakingTime,
          totalTime: totalTime,
          timeUtilized: Math.round(timeUtilized),
          timestamp: new Date().toISOString(),
        };

        answers.push(answerData);
        console.log("Answer data saved:", answerData);
      }

      function nextStep() {
        if (currentStep === "speaking") {
          stopRecording();
          showReview();
        }
      }

      function showReview() {
        currentStep = "review";
        const continueBtn = getEl(containerEl, "continueBtn");
        if (continueBtn) continueBtn.style.display = "none";
        
        const recordingStatus = getEl(containerEl, "recordingStatus");
        if (recordingStatus) recordingStatus.style.display = "none";
        
        const reviewSection = getEl(containerEl, "reviewSection");
        if (reviewSection) reviewSection.style.display = "block";
      }

      function stopAllAudio() {
        if (speechSynthesis) {
          speechSynthesis.cancel();
        }

        if (sampleAudio) {
          sampleAudio.pause();
          sampleAudio.currentTime = 0;
        }

        if (recordingAudio) {
          recordingAudio.pause();
          recordingAudio.currentTime = 0;
        }

        resetAudioButtons();
        isPlayingSample = false;
        isPlayingRecording = false;
      }

      function resetAudioButtons() {
        const sampleBtn = getEl(containerEl, "sampleBtn");
        const samplePlayIcon = getEl(containerEl, "samplePlayIcon");
        const sampleStopIcon = getEl(containerEl, "sampleStopIcon");
        const sampleBtnText = getEl(containerEl, "sampleBtnText");

        if (sampleBtn) {
          sampleBtn.classList.remove("playing");
          samplePlayIcon.style.display = "block";
          sampleStopIcon.style.display = "none";
          sampleBtnText.textContent = "SAMPLE";
        }

        const recordingBtn = getEl(containerEl, "recordingBtn");
        const recordingPlayIcon = getEl(containerEl, "recordingPlayIcon");
        const recordingStopIcon = getEl(containerEl, "recordingStopIcon");
        const recordingBtnText = getEl(containerEl, "recordingBtnText");

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

          const sampleBtn = getEl(containerEl, "sampleBtn");
          const samplePlayIcon = getEl(containerEl, "samplePlayIcon");
          const sampleStopIcon = getEl(containerEl, "sampleStopIcon");
          const sampleBtnText = getEl(containerEl, "sampleBtnText");

          sampleBtn.classList.add("playing");
          samplePlayIcon.style.display = "none";
          sampleStopIcon.style.display = "block";
          sampleBtnText.textContent = "STOP";

          currentUtterance = new SpeechSynthesisUtterance(
            currentQuestion.sampleAnswer
          );
          currentUtterance.rate = 0.9;
          currentUtterance.pitch = 1.0;
          currentUtterance.volume = 0.8;

          const voices = speechSynthesis.getVoices();
          const englishVoice =
            voices.find(
              (voice) =>
                voice.lang.startsWith("en") && !voice.name.includes("Google")
            ) || voices.find((voice) => voice.lang.startsWith("en"));

          if (englishVoice) {
            currentUtterance.voice = englishVoice;
          }

          currentUtterance.onend = () => {
            isPlayingSample = false;
            resetAudioButtons();
          };

          currentUtterance.onerror = () => {
            isPlayingSample = false;
            resetAudioButtons();
          };

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

          const recordingBtn = getEl(containerEl, "recordingBtn");
          const recordingPlayIcon =
            getEl(containerEl, "recordingPlayIcon");
          const recordingStopIcon =
            getEl(containerEl, "recordingStopIcon");
          const recordingBtnText = getEl(containerEl, "recordingBtnText");

          recordingBtn.classList.add("playing");
          recordingPlayIcon.style.display = "none";
          recordingStopIcon.style.display = "block";
          recordingBtnText.textContent = "STOP";

          const audioUrl = URL.createObjectURL(recordedBlob);
          recordingAudio = getEl(containerEl, "recordingAudio");
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

      const resultsHelper = initResultsScreen(containerEl, {
        skillName: "Speaking Sample",
        stagesTotal: STAGES_TOTAL,
        getScoreText: () => "",
        getNextQuizUrl: getNextQuizUrlFn,
        navigate: (url) => (typeof options.navigate === "function" ? options.navigate(url) : (window.location.href = url)),
        getState: () => ({ stagesCompletedThisSession }),
        onSelectNextStage() {
          const completedId = currentQuestion?.id;
          resetUI();
          initializeQuiz(completedId);
        },
        onDone() {
          stopAllAudio();
          incrementSkillProgress("Speaking Sample", stagesCompletedThisSession);
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";
        },
        selectors: { resultsScreen: "resultsScreen", resultsScore: "resultsScore", resultsContinueBtn: "resultsContinueBtn", doneBtn: ".done-btn", questionCard: "questionCard", questionCardDisplay: "flex", hideWhenResults: ["reviewSection"] },
      });
      if (resultsHelper.unbind && resultsHelper.unbind.length) unbind.push(...resultsHelper.unbind);

      function showResults() {
        stagesCompletedThisSession++;
        saveDetailedQuizResult("Speaking Sample");
        stopAllAudio();
        resultsHelper.showResults({ correct: 1, total: 1, stagesCompletedThisSession });
      }
      function saveDetailedQuizResult(skillName) {
        const sessionData = calculateSessionMetrics();

        // Create session result object
        const sessionResult = {
          skillName: skillName,
          sessionId: Date.now(),
          date: new Date().toISOString(),

          // Basic performance data
          totalQuestions: 1, // Speaking Sample typically has 1 question per session
          correctAnswers: 1, // All speaking responses are considered "completed"
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
            questionType: "speaking_sample",
            difficulty: determineTopicDifficulty(answer),
            speakingTime: answer.speakingTime,
            preparationTime: answer.preparationTime,
            totalTime: answer.totalTime,
            timeUtilized: answer.timeUtilized,
            topicType: categorizeTopicType(answer),
            sampleAnswer: answer.sampleAnswer,
            expectedElements: extractExpectedElements(answer.sampleAnswer),
          })),
        };

        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);
        console.log(`Session saved for ${skillName}:`, sessionResult);
      }

      // =============================================================================
      // 9. ADD SESSION METRICS CALCULATION FUNCTIONS
      // =============================================================================

      function calculateSessionMetrics() {
        const totalTime = answers.reduce(
          (sum, answer) => sum + answer.totalTime,
          0
        );
        const avgTime = totalTime / answers.length;

        // Calculate consistency - how stable speaking times are
        const speakingTimes = answers.map((answer) => answer.speakingTime);
        const avgSpeakingTime =
          speakingTimes.reduce((sum, time) => sum + time, 0) /
          speakingTimes.length;

        const timeDeviations = speakingTimes.map((time) =>
          Math.abs(time - avgSpeakingTime)
        );
        const avgDeviation =
          timeDeviations.reduce((sum, dev) => sum + dev, 0) /
          timeDeviations.length;
        const consistency = Math.max(
          0,
          100 - (avgDeviation / avgSpeakingTime) * 100
        );

        // Calculate difficulty handling score
        const difficultyScore = calculateDifficultyHandling();

        // Calculate speaking fluency (based on time utilization)
        const speakingFluency = calculateSpeakingFluency();

        // Calculate content quality (estimated based on time usage patterns)
        const contentQuality = calculateContentQuality();

        // Calculate time utilization efficiency
        const timeUtilization = calculateTimeUtilization();

        // Calculate preparation efficiency
        const preparationEfficiency = calculatePreparationEfficiency();

        return {
          totalTime: Math.round(totalTime / 1000), // Convert to seconds
          avgTime: Math.round(avgTime / 1000), // Convert to seconds
          consistency: Math.round(consistency),
          difficultyScore: difficultyScore,
          speakingFluency: speakingFluency,
          contentQuality: contentQuality,
          timeUtilization: timeUtilization,
          preparationEfficiency: preparationEfficiency,
        };
      }

      // =============================================================================
      // 10. ADD TOPIC ANALYSIS FUNCTIONS
      // =============================================================================

      function determineTopicDifficulty(answer) {
        let difficulty = 1; // Base difficulty (Easy)

        const topicText = answer.topicText.toLowerCase();
        const sampleAnswer = answer.sampleAnswer.toLowerCase();

        // Analyze sample answer complexity
        const sampleWords = answer.sampleAnswer.split(" ").length;
        const sampleSentences = answer.sampleAnswer
          .split(/[.!?]+/)
          .filter((s) => s.trim().length > 0).length;

        // Length-based complexity for Speaking Sample (longer format)
        if (sampleWords > 120 || sampleSentences > 8) {
          difficulty += 1; // Complex celebrations/traditions
        } else if (sampleWords > 90 || sampleSentences > 6) {
          difficulty += 0.5; // Medium complexity
        }

        // Topic complexity indicators for celebrations/traditions
        const complexTopics = [
          "tradition",
          "culture",
          "ceremony",
          "ritual",
          "custom",
          "religious",
          "historical",
          "significance",
          "heritage",
          "ancestor",
          "spiritual",
          "symbolism",
          "generation",
          "community",
          "sacred",
        ];
        const hasComplexElements = complexTopics.some(
          (element) =>
            topicText.includes(element) || sampleAnswer.includes(element)
        );
        if (hasComplexElements) {
          difficulty += 0.5;
        }

        // Cultural/social complexity indicators
        const culturalTerms = [
          "traditional",
          "ancient",
          "ceremony",
          "festival",
          "celebration",
          "cultural",
          "social",
          "community",
          "family gathering",
          "reunion",
        ];
        if (
          culturalTerms.some(
            (term) => topicText.includes(term) || sampleAnswer.includes(term)
          )
        ) {
          difficulty += 0.3;
        }

        // Detailed description requirements
        const detailTerms = [
          "describe",
          "explain",
          "what happens",
          "how do people",
          "traditions",
          "customs",
          "activities",
          "procedures",
          "steps",
          "process",
        ];
        if (detailTerms.some((term) => topicText.includes(term))) {
          difficulty += 0.4;
        }

        // Clamp difficulty between 1-3
        difficulty = Math.max(1, Math.min(3, difficulty));

        if (difficulty <= 1.5) return "easy";
        if (difficulty <= 2.5) return "medium";
        return "hard";
      }

      function categorizeTopicType(answer) {
        const topicText = answer.topicText.toLowerCase();
        const sampleAnswer = answer.sampleAnswer.toLowerCase();

        if (
          topicText.includes("family") ||
          topicText.includes("birthday") ||
          topicText.includes("anniversary") ||
          sampleAnswer.includes("family")
        ) {
          return "family_celebrations";
        } else if (
          topicText.includes("holiday") ||
          topicText.includes("national") ||
          topicText.includes("independence") ||
          topicText.includes("country")
        ) {
          return "national_holidays";
        } else if (
          topicText.includes("wedding") ||
          topicText.includes("marriage") ||
          topicText.includes("ceremony") ||
          sampleAnswer.includes("wedding")
        ) {
          return "wedding_ceremonies";
        } else if (
          topicText.includes("religious") ||
          topicText.includes("festival") ||
          topicText.includes("spiritual") ||
          sampleAnswer.includes("religious")
        ) {
          return "religious_festivals";
        } else if (
          topicText.includes("graduation") ||
          topicText.includes("achievement") ||
          topicText.includes("success")
        ) {
          return "achievement_celebrations";
        } else if (
          topicText.includes("seasonal") ||
          topicText.includes("harvest") ||
          topicText.includes("spring") ||
          topicText.includes("winter")
        ) {
          return "seasonal_celebrations";
        }

        return "general_celebrations";
      }

      function extractExpectedElements(sampleAnswer) {
        const elements = [];
        const text = sampleAnswer.toLowerCase();

        // Key elements for celebration/tradition descriptions
        const settingElements = [
          "house",
          "home",
          "garden",
          "church",
          "park",
          "restaurant",
          "venue",
          "location",
          "place",
          "building",
        ];
        const peopleElements = [
          "family",
          "friends",
          "relatives",
          "guests",
          "children",
          "parents",
          "grandmother",
          "grandfather",
          "people",
          "everyone",
        ];
        const activityElements = [
          "celebrate",
          "gather",
          "eat",
          "dance",
          "sing",
          "play",
          "decorate",
          "prepare",
          "cook",
          "share",
          "stories",
          "photos",
        ];
        const emotionElements = [
          "happy",
          "joy",
          "special",
          "important",
          "together",
          "connected",
          "proud",
          "celebration",
          "fun",
          "wonderful",
        ];
        const traditionalElements = [
          "tradition",
          "custom",
          "ritual",
          "ceremony",
          "festival",
          "holiday",
          "celebration",
          "special",
          "cultural",
          "heritage",
        ];

        [
          settingElements,
          peopleElements,
          activityElements,
          emotionElements,
          traditionalElements,
        ].forEach((elementGroup) => {
          elementGroup.forEach((element) => {
            if (text.includes(element)) elements.push(element);
          });
        });

        return [...new Set(elements)]; // Remove duplicates
      }

      // =============================================================================
      // 11. ADD PERFORMANCE CALCULATION FUNCTIONS
      // =============================================================================

      function calculateDifficultyHandling() {
        const difficultyStats = {
          easy: { responses: 0, totalTime: 0, avgUtilization: 0 },
          medium: { responses: 0, totalTime: 0, avgUtilization: 0 },
          hard: { responses: 0, totalTime: 0, avgUtilization: 0 },
        };

        // Analyze performance by difficulty
        answers.forEach((answer) => {
          const difficulty = determineTopicDifficulty(answer);
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

            // Time utilization bonus (using most of available time is good for longer format)
            if (avgUtilization > 75) {
              difficultyScore += 35;
            } else if (avgUtilization > 60) {
              difficultyScore += 25;
            } else if (avgUtilization > 40) {
              difficultyScore += 15;
            }

            // Consistency bonus for appropriate speaking time (longer for Speaking Sample)
            const expectedTime =
              difficulty === "easy"
                ? 120000 // 2 minutes
                : difficulty === "medium"
                ? 150000 // 2.5 minutes
                : 170000; // 2.8 minutes (milliseconds)
            if (Math.abs(avgTime - expectedTime) < expectedTime * 0.25) {
              difficultyScore += 15;
            }

            const weight =
              difficulty === "easy" ? 1 : difficulty === "medium" ? 1.5 : 2;
            weightedScore += difficultyScore * weight;
            totalWeight += weight;
          }
        });

        return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
      }

      function calculateSpeakingFluency() {
        let fluencyScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          validResponses++;
          let responseScore = 0;

          // Time utilization score (using 60-90% of available time is optimal for longer format)
          const utilization = answer.timeUtilized;
          if (utilization >= 60 && utilization <= 90) {
            responseScore += 40;
          } else if (utilization >= 45 && utilization < 60) {
            responseScore += 25;
          } else if (utilization > 90) {
            responseScore += 30; // Good but might be rushed
          }

          // Consistency in speaking time (longer format allows more variation)
          const speakingTimeSeconds = answer.speakingTime / 1000;
          if (speakingTimeSeconds >= 120 && speakingTimeSeconds <= 170) {
            responseScore += 30;
          } else if (speakingTimeSeconds >= 90 && speakingTimeSeconds <= 120) {
            responseScore += 20;
          }

          // Preparation vs speaking time balance (longer preparation is acceptable)
          const prepRatio =
            answer.preparationTime /
            (answer.preparationTime + answer.speakingTime);
          if (prepRatio >= 0.08 && prepRatio <= 0.18) {
            // 8-18% preparation time is good for longer format
            responseScore += 20;
          } else if (prepRatio >= 0.05 && prepRatio <= 0.22) {
            responseScore += 15;
          }

          // Timing efficiency (not running over time limits)
          if (answer.speakingTime <= 182000) {
            // Within 182 seconds (allowing small buffer)
            responseScore += 10;
          }

          fluencyScore += Math.min(responseScore, 100);
        });

        return validResponses > 0
          ? Math.round(fluencyScore / validResponses)
          : 0;
      }

      function calculateContentQuality() {
        let qualityScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          validResponses++;
          let responseScore = 50; // Base score

          // Length appropriateness (longer speaking for detailed celebrations)
          const speakingTimeSeconds = answer.speakingTime / 1000;
          if (speakingTimeSeconds >= 120 && speakingTimeSeconds <= 170) {
            responseScore += 30; // Optimal length for detailed descriptions
          } else if (speakingTimeSeconds >= 90 && speakingTimeSeconds < 120) {
            responseScore += 20; // Good length
          } else if (speakingTimeSeconds >= 60 && speakingTimeSeconds < 90) {
            responseScore += 10; // Acceptable but brief
          }

          // Preparation time usage (good preparation for complex celebrations)
          const prepTimeSeconds = answer.preparationTime / 1000;
          if (prepTimeSeconds >= 15 && prepTimeSeconds <= 30) {
            responseScore += 15; // Good preparation time for longer format
          } else if (prepTimeSeconds >= 10 && prepTimeSeconds < 15) {
            responseScore += 10; // Some preparation
          }

          // Difficulty bonus (detailed celebration descriptions deserve more points)
          const difficulty = determineTopicDifficulty(answer);
          if (difficulty === "hard" && speakingTimeSeconds >= 120) {
            responseScore += 15;
          } else if (difficulty === "medium" && speakingTimeSeconds >= 90) {
            responseScore += 10;
          }

          qualityScore += Math.min(responseScore, 100);
        });

        return validResponses > 0
          ? Math.round(qualityScore / validResponses)
          : 0;
      }

      function calculateTimeUtilization() {
        const totalUtilization = answers.reduce(
          (sum, answer) => sum + answer.timeUtilized,
          0
        );
        return answers.length > 0
          ? Math.round(totalUtilization / answers.length)
          : 0;
      }

      function calculatePreparationEfficiency() {
        let efficiencyScore = 0;
        let validResponses = 0;

        answers.forEach((answer) => {
          validResponses++;
          const prepTime = answer.preparationTime / 1000; // Convert to seconds

          // Optimal preparation time is 15-25 seconds for Speaking Sample (longer format)
          if (prepTime >= 15 && prepTime <= 25) {
            efficiencyScore += 100;
          } else if (prepTime >= 10 && prepTime <= 30) {
            efficiencyScore += 85;
          } else if (prepTime >= 5 && prepTime <= 35) {
            efficiencyScore += 70;
          } else {
            efficiencyScore += 50; // Too little or too much preparation
          }
        });

        return validResponses > 0
          ? Math.round(efficiencyScore / validResponses)
          : 0;
      }

      function calculateSessionScore(sessionData) {
        // Scoring weights for Speaking Sample tasks (longer format)
        const weights = {
          speakingFluency: 0.28, // 28% - Important for longer speaking
          contentQuality: 0.3, // 30% - Most important for detailed descriptions
          timeUtilization: 0.18, // 18% - Using available time well
          preparationEfficiency: 0.12, // 12% - Good preparation for complex topics
          consistency: 0.08, // 8% - Less important for single question
          difficulty: 0.04, // 4% - Handling complex celebrations
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
      // =============================================================================
      // 12. ADD PROGRESS TRACKING FUNCTIONS
      // =============================================================================

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
            "speakingSampleProgress",
            JSON.stringify(progressData)
          );
          console.log(`Progress updated: ${skillName} - ${newCompleted}/3`);
        } catch (error) {
          console.error("Error saving progress:", error);
        }
      }

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

      // =============================================================================
      // 13. ADD HISTORY AND ASSESSMENT FUNCTIONS
      // =============================================================================

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

      function updateSkillOverallAssessment(skillName, allSessions) {
        if (!allSessions || allSessions.length === 0) return;

        // Calculate overall metrics for Speaking Sample
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
          lastSession.contentQuality - firstSession.contentQuality; // Focus on content for celebrations

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
          speakingFluency: 0.3,
          contentQuality: 0.35, // Higher weight for detailed descriptions
          timeUtilization: 0.18,
          avgScore: 0.12,
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

          // Speaking Sample specific metrics
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

      // Helper functions for assessment
      function calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
        const avgSquaredDiff =
          squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
      }
      function determineSkillLevel(score) {
        if (score >= 90) return "Advanced";
        if (score >= 75) return "Upper-Intermediate";
        if (score >= 60) return "Intermediate";
        if (score >= 45) return "Lower-Intermediate";
        if (score >= 30) return "Elementary";
        return "Beginner";
      }

      function identifyStrongPoints(sessions) {
        const strongPoints = [];

        // Check speaking fluency
        const avgSpeakingFluency =
          sessions.reduce((sum, s) => sum + s.speakingFluency, 0) /
          sessions.length;
        if (avgSpeakingFluency >= 80) {
          strongPoints.push("Excellent speaking fluency and pacing");
        }

        // Check content quality
        const avgContentQuality =
          sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
          sessions.length;
        if (avgContentQuality >= 75) {
          strongPoints.push(
            "Rich, detailed descriptions of celebrations and traditions"
          );
        }

        // Check time utilization
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization >= 75) {
          strongPoints.push("Excellent use of available speaking time");
        }

        // Check preparation efficiency
        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency >= 85) {
          strongPoints.push("Efficient preparation for detailed topics");
        }

        // Check consistency
        const sessionScores = sessions.map((s) => s.sessionScore);
        const scoreStdDev = calculateStandardDeviation(sessionScores);
        if (scoreStdDev <= 12) {
          strongPoints.push(
            "Consistent performance across different celebration topics"
          );
        }

        // Check for long-format speaking ability
        const avgSpeakingTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgSpeakingTime >= 120) {
          strongPoints.push("Strong ability to maintain extended speaking");
        }

        return strongPoints.length > 0
          ? strongPoints
          : ["Shows potential for improvement in celebration descriptions"];
      }

      function identifyWeakPoints(sessions) {
        const weakPoints = [];

        // Check speaking fluency
        const avgSpeakingFluency =
          sessions.reduce((sum, s) => sum + s.speakingFluency, 0) /
          sessions.length;
        if (avgSpeakingFluency < 60) {
          weakPoints.push(
            "Speaking fluency needs improvement for longer responses"
          );
        }

        // Check content quality
        const avgContentQuality =
          sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
          sessions.length;
        if (avgContentQuality < 65) {
          weakPoints.push(
            "Focus on providing more detailed celebration descriptions"
          );
        }

        // Check time utilization
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization < 55) {
          weakPoints.push(
            "Try to use more of the 3-minute speaking time available"
          );
        } else if (avgTimeUtilization > 95) {
          weakPoints.push(
            "Practice pacing to avoid rushing through descriptions"
          );
        }

        // Check preparation efficiency
        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency < 70) {
          weakPoints.push(
            "Improve preparation time management for complex topics"
          );
        }

        // Check for brief responses
        const avgSpeakingTime =
          sessions.reduce((sum, s) => sum + s.averageTimePerQuestion, 0) /
          sessions.length;
        if (avgSpeakingTime < 90) {
          weakPoints.push(
            "Practice extending responses with more details and examples"
          );
        }

        return weakPoints.length > 0
          ? weakPoints
          : ["Keep practicing to maintain progress"];
      }

      function generateRecommendations(sessions, finalScore) {
        const recommendations = [];

        if (finalScore < 50) {
          recommendations.push(
            "Start with familiar celebrations (birthdays, holidays)"
          );
          recommendations.push(
            "Use the full 30-second preparation time to organize thoughts"
          );
          recommendations.push(
            "Practice describing who, what, when, where, and why"
          );
          recommendations.push(
            "Focus on simple, clear descriptions before adding details"
          );
        } else if (finalScore < 70) {
          recommendations.push(
            "Work on speaking for at least 2 minutes of the available time"
          );
          recommendations.push("Practice describing traditions step-by-step");
          recommendations.push(
            "Add more sensory details (what you see, hear, taste, smell)"
          );
          recommendations.push(
            "Include personal feelings and emotions about celebrations"
          );
        } else if (finalScore < 85) {
          recommendations.push(
            "Challenge yourself with complex cultural celebrations"
          );
          recommendations.push(
            "Practice comparing different celebrations or traditions"
          );
          recommendations.push(
            "Work on smooth transitions between different aspects"
          );
          recommendations.push(
            "Add historical or cultural context to your descriptions"
          );
        } else {
          recommendations.push(
            "Excellent work! Try discussing regional celebration variations"
          );
          recommendations.push("Practice with abstract celebration concepts");
          recommendations.push("Focus on cultural significance and symbolism");
          recommendations.push(
            "Help others improve their celebration description skills"
          );
        }

        // Specific recommendations based on metrics
        const avgTimeUtilization =
          sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
          sessions.length;
        if (avgTimeUtilization < 60) {
          recommendations.push(
            "Practice speaking for the full 3 minutes available"
          );
          recommendations.push(
            "Prepare mental lists of celebration activities and details"
          );
        }

        const avgPrepEfficiency =
          sessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
          sessions.length;
        if (avgPrepEfficiency < 75) {
          recommendations.push(
            "Use preparation time to outline: setting, people, activities, significance"
          );
        }

        const avgContentQuality =
          sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
          sessions.length;
        if (avgContentQuality < 70) {
          recommendations.push(
            "Include more specific examples and personal experiences"
          );
          recommendations.push(
            "Practice describing emotions and atmosphere of celebrations"
          );
        }

        return recommendations;
      }
      function goBack() {
        const msg = "Are you sure you want to exit the quiz?";
        const confirmed = typeof window.showConfirmDialog === "function"
          ? null
          : confirm(msg);
        const doExit = () => {
          if (stagesCompletedThisSession > 0) incrementSkillProgress("Speaking Sample", stagesCompletedThisSession);
          stopAllAudio();
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "/";
        };
        if (confirmed === null) {
          Promise.resolve(window.showConfirmDialog(msg)).then(ok => { if (ok) doExit(); });
        } else if (confirmed) {
          doExit();
        }
      }

      // Function to update progress when quiz is completed
      function updateProgress() {
        const skillName = "Speaking Sample";
        const currentProgress = getSkillCurrentProgress(skillName);
        const newProgress = currentProgress + 1;
        const totalQuestions = 3; // Speaking Sample has 3 questions total
        const progressData = {
          skill: skillName,
          completed: Math.min(newProgress, totalQuestions),
          total: totalQuestions,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("speakingSampleProgress", JSON.stringify(progressData));
        console.log(`Speaking Sample progress updated: ${progressData.completed}/${progressData.total}`);
      }
      function getSkillCurrentProgress(skillName) {
        const progressKey = "skillProgress";
        try {
          const stored = localStorage.getItem(progressKey);
          if (stored) {
            const allProgress = JSON.parse(stored);
            if (allProgress[skillName]) return allProgress[skillName].completed || 0;
          }
        } catch (error) {
          console.error("Error reading current progress:", error);
        }
        return 0;
      }
      const originalShowResults = showResults;
      showResults = function () {
        originalShowResults();
        updateProgress();
      };

      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = function () { console.log("Voices loaded:", speechSynthesis.getVoices().length); };
      }
      const errScreen = getEl(containerEl, "errorScreen");
      if (errScreen) {
        const errorBtns = errScreen.querySelectorAll(".retry-data-btn");
        if (errorBtns[0]) { errorBtns[0].addEventListener("click", loadQuizData); unbind.push(() => errorBtns[0].removeEventListener("click", loadQuizData)); }
        if (errorBtns[1]) { errorBtns[1].addEventListener("click", goBack); unbind.push(() => errorBtns[1].removeEventListener("click", goBack)); }
      }
      const closeBtn = containerEl.querySelector(".close-btn");
      if (closeBtn) { closeBtn.addEventListener("click", goBack); unbind.push(() => closeBtn.removeEventListener("click", goBack)); }
      const recBtn = getEl(containerEl, "recordButton");
      if (recBtn) { recBtn.addEventListener("click", handleRecord); unbind.push(() => recBtn.removeEventListener("click", handleRecord)); }
      const sampBtn = getEl(containerEl, "sampleBtn");
      if (sampBtn) { sampBtn.addEventListener("click", toggleSample); unbind.push(() => sampBtn.removeEventListener("click", toggleSample)); }
      const recPlayBtn = getEl(containerEl, "recordingBtn");
      if (recPlayBtn) { recPlayBtn.addEventListener("click", toggleRecording); unbind.push(() => recPlayBtn.removeEventListener("click", toggleRecording)); }
      const contReviewBtn = containerEl.querySelector(".continue-review-btn") || getEl(containerEl, "continueReviewBtn");
      if (contReviewBtn) { contReviewBtn.addEventListener("click", showResults); unbind.push(() => contReviewBtn.removeEventListener("click", showResults)); }
      const contBtn = getEl(containerEl, "continueBtn");
      if (contBtn) { contBtn.addEventListener("click", nextStep); unbind.push(() => contBtn.removeEventListener("click", nextStep)); }
      loadQuizData();
      return function cleanup() {
        unbind.forEach((f) => f());
        if (timerInterval) clearInterval(timerInterval);
      };
}
