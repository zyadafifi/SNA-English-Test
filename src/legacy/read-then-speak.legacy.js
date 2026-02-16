import { getNextQuizUrl } from './skills-config.legacy.js';
import { getQuizDataUrl } from './quiz-data-url.js';
import { initResultsScreen } from './shared/resultsScreen.js';

export function init(containerEl, options = {}) {
  if (!containerEl) return function noop() {};
  const getEl = (root, id) => root.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const getNextQuizUrlFn = options.getNextQuizUrl || getNextQuizUrl;
  const unbind = [];
  const STAGES_TOTAL = 3;

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
      let sessionStartTime = Date.now();
      let answers = []; // Array to store all responses
      let currentQuestionData = null; // Current question being answered

      // Response timing variables
      let questionPrepStartTime = 0;
      let questionSpeakStartTime = 0;
      let actualPreparationTime = 0;
      let actualSpeakingTime = 0;
      // Configuration
      const PREPARE_TIME = 15000; // 15 seconds preparation time
      const RECORDING_TIME = 90000; // Will be loaded from JSON

      // Load Quiz Data from JSON
      async function loadQuizData() {
        try {
          showLoadingScreen();

          const response = await fetch(getQuizDataUrl("read then speak data.json"));
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

        console.log(`Starting quiz with question ID: ${currentQuestion.id}`);
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
          topicQuestions: currentQuestion.topicQuestions,
          sampleAnswer: currentQuestion.sampleAnswer,
          startTime: Date.now(),
          preparationStartTime: Date.now(),
        };

        // Reset timing variables
        questionPrepStartTime = Date.now();
        actualPreparationTime = 0;
        actualSpeakingTime = 0;

        // Reset UI
        resetUI();

        // Set topic content
        getEl(containerEl, "topicText").textContent =
          currentQuestion.topicText;

        // Set topic questions
        const questionsContainer = getEl(containerEl, "topicQuestions");
        if (questionsContainer && currentQuestion.topicQuestions && Array.isArray(currentQuestion.topicQuestions)) {
          questionsContainer.innerHTML = "";
          currentQuestion.topicQuestions.forEach((question) => {
            const li = document.createElement("li");
            li.textContent = question;
            questionsContainer.appendChild(li);
          });
        }

        // Set initial state - preparation mode
        getEl(containerEl, "questionTitle").textContent =
          "Prepare to speak about the topic below";
        getEl(containerEl, "questionSubtitle").textContent =
          "You will have 90 seconds to speak";

        // Show record button, hide others
        getEl(containerEl, "recordButton").style.display = "block";
        getEl(containerEl, "recordingStatus").style.display = "none";
        getEl(containerEl, "audioVisualizer").style.display = "none";
        getEl(containerEl, "continueBtn").style.display = "none";

        // Hide review section and results
        getEl(containerEl, "reviewSection").style.display = "none";
        getEl(containerEl, "resultsScreen").style.display = "none";
        getEl(containerEl, "questionCard").style.display = "flex";

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
        const recordButton = getEl(containerEl, "recordButton");
        recordButton.classList.remove("recording");
        recordButton.style.display = "block";

        // Hide status elements initially
        getEl(containerEl, "recordingStatus").style.display = "none";
        getEl(containerEl, "audioVisualizer").style.display = "none";
        getEl(containerEl, "continueBtn").style.display = "none";

        // Reset timer
        getEl(containerEl, "timer").classList.remove("warning");

        // Stop any recording
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }

        // Reset recorded data
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
        const maxSeconds = PREPARE_TIME / 1000;
        const timerElement = getEl(containerEl, "timer");
        const timerText = getEl(containerEl, "timerText");
        if (timerText) timerText.textContent = "0:00";

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (seconds >= 10 && timerElement) timerElement.classList.add("warning");
          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            timerInterval = null;
            startRecording();
          }
        }, 1000);

        // Set timeout to auto-start recording after 15 seconds
        prepareTimeout = setTimeout(() => {
          startRecording();
        }, PREPARE_TIME);
      }

      async function handleRecord() {
        if (currentStep === "prepare") {
          // User clicked record button during preparation
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

        // Update UI for recording mode
        getEl(containerEl, "questionTitle").textContent =
          "Speak about the topic below";
        getEl(containerEl, "questionSubtitle").textContent =
          "You have 90 seconds to speak";
        getEl(containerEl, "recordButton").style.display = "none";
        getEl(containerEl, "recordingStatus").style.display = "flex";
        getEl(containerEl, "audioVisualizer").style.display = "flex";
        const continueBtnEl = getEl(containerEl, "continueBtn");
        if (continueBtnEl) {
          continueBtnEl.style.display = "block";
          continueBtnEl.disabled = true;
        }

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

            // Calculate actual speaking time and save answer data
            actualSpeakingTime = Date.now() - questionSpeakStartTime;
            saveAnswerData();
          };

          mediaRecorder.start();
          console.log("Recording started");
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
        const maxSeconds = quizConfig.speakingTime || 90;
        const timer = getEl(containerEl, "timer");
        const timerText = getEl(containerEl, "timerText");
        if (timer) timer.classList.remove("warning");
        if (timerText) timerText.textContent = "0:00";

        timerInterval = setInterval(() => {
          seconds++;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (timerText) timerText.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (seconds >= maxSeconds) {
            clearInterval(timerInterval);
            timerInterval = null;
            stopRecording();
            const cb = getEl(containerEl, "continueBtn");
            if (cb) cb.disabled = false;
          }
        }, 1000);

        // Set timeout to auto-stop recording
        recordingTimeout = setTimeout(() => {
          stopRecording();
          const cb = getEl(containerEl, "continueBtn");
          if (cb) cb.disabled = false;
        }, (quizConfig.speakingTime || 90) * 1000);
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

        // Hide recording status and audio visualizer
        getEl(containerEl, "recordingStatus").style.display = "none";
        getEl(containerEl, "audioVisualizer").style.display = "none";

        console.log("Recording stopped");
      }
      function saveAnswerData() {
        const totalTime = actualPreparationTime + actualSpeakingTime;
        const maxSpeakingTime = (quizConfig.speakingTime || 90) * 1000; // Convert to milliseconds
        const timeUtilized = Math.min(
          (actualSpeakingTime / maxSpeakingTime) * 100,
          100
        );

        const answerData = {
          questionId: currentQuestion.id,
          topicText: currentQuestion.topicText,
          topicQuestions: currentQuestion.topicQuestions,
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

        // Keep question card visible but hide the continue button
        getEl(containerEl, "continueBtn").style.display = "none";

        // Hide recording status and audio visualizer since recording is done
        getEl(containerEl, "recordingStatus").style.display = "none";
        getEl(containerEl, "audioVisualizer").style.display = "none";

        // Show review section
        getEl(containerEl, "reviewSection").style.display = "block";
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

        // Reset recording button
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

          // Update button appearance
          const sampleBtn = getEl(containerEl, "sampleBtn");
          const samplePlayIcon = getEl(containerEl, "samplePlayIcon");
          const sampleStopIcon = getEl(containerEl, "sampleStopIcon");
          const sampleBtnText = getEl(containerEl, "sampleBtnText");

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
        skillName: "Read, Then Speak",
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
          const progressKey = "skillProgress";
          const allProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
          const currentProgress = allProgress["Read, Then Speak"] || { completed: 0, total: 3 };
          if (currentProgress.completed < currentProgress.total) {
            incrementSkillProgress("Read, Then Speak", stagesCompletedThisSession);
          }
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "index.html";
        },
        selectors: { resultsScreen: "resultsScreen", resultsScore: "resultsScore", resultsContinueBtn: "resultsContinueBtn", doneBtn: ".done-btn", questionCard: "questionCard", questionCardDisplay: "flex", hideWhenResults: ["reviewSection"] },
      });
      if (resultsHelper.unbind && resultsHelper.unbind.length) unbind.push(...resultsHelper.unbind);

      function showResults() {
        stagesCompletedThisSession++;
        saveDetailedQuizResult("Read Then Speak");
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
          totalQuestions: 1, // Read Then Speak typically has 1 question per session
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
            questionType: "read_then_speak",
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
        function determineTopicDifficulty(answer) {
          let difficulty = 1; // Base difficulty (Easy)

          const topicText = answer.topicText.toLowerCase();
          const sampleAnswer = answer.sampleAnswer.toLowerCase();

          // Analyze sample answer complexity
          const sampleWords = answer.sampleAnswer.split(" ").length;
          const sampleSentences = answer.sampleAnswer
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0).length;

          // Length-based complexity
          if (sampleWords > 100 || sampleSentences > 7) {
            difficulty += 1; // Complex topics
          } else if (sampleWords > 80 || sampleSentences > 5) {
            difficulty += 0.5; // Medium complexity
          }

          // Topic complexity indicators
          const complexTopics = [
            "technology",
            "culture",
            "society",
            "environment",
            "economy",
            "politics",
            "philosophy",
            "abstract",
            "analyze",
            "evaluate",
            "compare",
            "contrast",
            "argue",
            "defend",
            "justify",
          ];
          const hasComplexElements = complexTopics.some(
            (element) =>
              topicText.includes(element) || sampleAnswer.includes(element)
          );
          if (hasComplexElements) {
            difficulty += 0.5;
          }

          // Multiple question indicators (more complex to address multiple points)
          if (answer.topicQuestions.length > 2) {
            difficulty += 0.3;
          }

          // Abstract vs concrete topics
          const abstractTerms = [
            "importance",
            "role",
            "impact",
            "effect",
            "influence",
            "benefit",
            "challenge",
            "advantage",
            "disadvantage",
          ];
          if (abstractTerms.some((term) => topicText.includes(term))) {
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
            topicText.includes("hobby") ||
            topicText.includes("interest") ||
            topicText.includes("enjoy")
          ) {
            return "personal_interests";
          } else if (
            topicText.includes("family") ||
            topicText.includes("friend") ||
            topicText.includes("relationship")
          ) {
            return "relationships";
          } else if (
            topicText.includes("place") ||
            topicText.includes("travel") ||
            topicText.includes("visit")
          ) {
            return "places_travel";
          } else if (
            topicText.includes("job") ||
            topicText.includes("work") ||
            topicText.includes("career")
          ) {
            return "work_career";
          } else if (
            topicText.includes("technology") ||
            topicText.includes("modern") ||
            topicText.includes("internet")
          ) {
            return "technology";
          } else if (
            topicText.includes("health") ||
            topicText.includes("exercise") ||
            topicText.includes("food")
          ) {
            return "health_lifestyle";
          } else if (
            topicText.includes("culture") ||
            topicText.includes("festival") ||
            topicText.includes("celebration")
          ) {
            return "culture";
          }

          return "general";
        }
        function extractExpectedElements(sampleAnswer) {
          const elements = [];
          const words = sampleAnswer.toLowerCase().split(" ");

          // Key speaking elements for Read Then Speak
          const structuralElements = [
            "first",
            "second",
            "also",
            "because",
            "however",
            "therefore",
            "for example",
            "in conclusion",
            "moreover",
            "furthermore",
          ];
          const descriptiveElements = [
            "important",
            "special",
            "interesting",
            "beautiful",
            "useful",
            "helpful",
            "enjoyable",
            "necessary",
            "effective",
            "beneficial",
          ];
          const personalElements = [
            "i think",
            "i believe",
            "in my opinion",
            "i feel",
            "my experience",
            "personally",
            "i would",
            "i like",
            "i enjoy",
            "i prefer",
          ];

          structuralElements.forEach((element) => {
            if (sampleAnswer.toLowerCase().includes(element))
              elements.push(element);
          });

          descriptiveElements.forEach((element) => {
            if (words.includes(element)) elements.push(element);
          });

          personalElements.forEach((element) => {
            if (sampleAnswer.toLowerCase().includes(element))
              elements.push(element);
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

          answers.forEach((answer) => {
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

            // Difficulty bonus (speaking well about complex topics deserves more points)
            const difficulty = determineTopicDifficulty(answer);
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

            // Optimal preparation time is 8-12 seconds for Read Then Speak
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
          // Scoring weights for Read Then Speak tasks
          const weights = {
            speakingFluency: 0.3, // 30% - Most important for speaking
            contentQuality: 0.25, // 25% - Quality of content
            timeUtilization: 0.2, // 20% - Using available time well
            preparationEfficiency: 0.1, // 10% - Good preparation
            consistency: 0.1, // 10% - Consistent performance
            difficulty: 0.05, // 5% - Handling complex topics
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

          // Calculate overall metrics for Read Then Speak
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

            // Read Then Speak specific metrics
            averagePreparationEfficiency: Math.round(
              allSessions.reduce((sum, s) => sum + s.preparationEfficiency, 0) /
                allSessions.length
            ),
            averageSpeakingTime: Math.round(
              allSessions.reduce(
                (sum, s) => sum + s.averageTimePerQuestion,
                0
              ) / allSessions.length
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

          // Check speaking fluency
          const avgSpeakingFluency =
            sessions.reduce((sum, s) => sum + s.speakingFluency, 0) /
            sessions.length;
          if (avgSpeakingFluency >= 80) {
            strongPoints.push("Excellent speaking fluency and flow");
          }

          // Check content quality
          const avgContentQuality =
            sessions.reduce((sum, s) => sum + s.contentQuality, 0) /
            sessions.length;
          if (avgContentQuality >= 75) {
            strongPoints.push("High quality responses to topic questions");
          }

          // Check time utilization
          const avgTimeUtilization =
            sessions.reduce((sum, s) => sum + s.timeUtilization, 0) /
            sessions.length;
          if (avgTimeUtilization >= 80) {
            strongPoints.push("Excellent time management during speaking");
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
              weakPoints.push(
                "Focus on providing more detailed topic responses"
              );
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
            if (avgPrepEfficiency >= 85) {
              strongPoints.push("Efficient preparation before speaking");
            }
            // Check consistency
            const sessionScores = sessions.map((s) => s.sessionScore);
            const scoreStdDev = calculateStandardDeviation(sessionScores);
            if (scoreStdDev <= 10) {
              strongPoints.push("Consistent performance across sessions");
            }
          }
        }

        // Generate personalized recommendations
        function generateRecommendations(sessions, finalScore) {
          const recommendations = [];

          if (finalScore < 50) {
            recommendations.push(
              "Practice speaking about familiar topics first"
            );
            recommendations.push(
              "Use the full preparation time to organize thoughts"
            );
            recommendations.push(
              "Focus on answering all topic questions clearly"
            );
          } else if (finalScore < 70) {
            recommendations.push(
              "Work on speaking for the full time available"
            );
            recommendations.push(
              "Practice organizing responses with clear structure"
            );
            recommendations.push(
              "Try to provide examples and details in answers"
            );
          } else if (finalScore < 85) {
            recommendations.push("Challenge yourself with more complex topics");
            recommendations.push(
              "Practice advanced speaking techniques and transitions"
            );
            recommendations.push("Work on fluency and natural speech patterns");
          } else {
            recommendations.push(
              "Excellent work! Try discussing abstract concepts"
            );
            recommendations.push(
              "Practice with professional or academic topics"
            );
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
              "Use preparation time more effectively to plan your response structure"
            );
          }

          return recommendations;
        }
        // Save result to localStorage
        saveSessionToHistory(skillName, sessionResult);
        console.log(`Session saved for ${skillName}:`, sessionResult);
      }
      // Function to increment progress by 1 or more
      function incrementSkillProgress(skillName, count = 1) {
        try {
          // Get current progress data from localStorage
          const progressKey = "skillProgress";
          const allProgress =
            JSON.parse(localStorage.getItem(progressKey)) || {};

          // Initialize progress data if it doesn't exist for this skill
          if (!allProgress[skillName]) {
            allProgress[skillName] = {
              completed: 0,
              total: 3,
              lastUpdated: new Date().toISOString(),
            };
          }

          // Increment progress while ensuring it doesn't exceed the maximum
          allProgress[skillName].completed = Math.min(
            allProgress[skillName].completed + count,
            allProgress[skillName].total
          );
          allProgress[skillName].lastUpdated = new Date().toISOString();

          // Save updated progress back to localStorage
          localStorage.setItem(progressKey, JSON.stringify(allProgress));

          console.log(
            `Progress updated for ${skillName}: ${allProgress[skillName].completed}/${allProgress[skillName].total}`
          );

          // Dispatch event to notify main page of progress update
          const progressEvent = new CustomEvent("progressUpdated", {
            detail: {
              skill: skillName,
              progress: allProgress[skillName],
            },
          });
          window.dispatchEvent(progressEvent);

          return true;
        } catch (error) {
          console.error("Error updating progress:", error);
          return false;
        }
      }
      function getSkillProgress(skillName) {
        try {
          const progressKey = "skillProgress";
          const allProgress =
            JSON.parse(localStorage.getItem(progressKey)) || {};
          return allProgress[skillName] || { completed: 0, total: 3 };
        } catch (error) {
          console.error("Error getting progress:", error);
          return { completed: 0, total: 3 };
        }
      }

      function resetSkillProgress(skillName) {
        try {
          const progressKey = "skillProgress";
          const allProgress =
            JSON.parse(localStorage.getItem(progressKey)) || {};
          allProgress[skillName] = {
            completed: 0,
            total: 3,
            lastUpdated: new Date().toISOString(),
          };
          localStorage.setItem(progressKey, JSON.stringify(allProgress));
          return true;
        } catch (error) {
          console.error("Error resetting progress:", error);
          return false;
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
        const msg = "Are you sure you want to exit the quiz?";
        const confirmed = typeof window.showConfirmDialog === "function"
          ? null
          : confirm(msg);
        const doExit = () => {
          if (stagesCompletedThisSession > 0) incrementSkillProgress("Read, Then Speak", stagesCompletedThisSession);
          stopAllAudio();
          if (typeof options.navigate === "function") options.navigate("/"); else window.location.href = "/";
        };
        if (confirmed === null) {
          Promise.resolve(window.showConfirmDialog(msg)).then(ok => { if (ok) doExit(); });
        } else if (confirmed) {
          doExit();
        }
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
        }
      }; document.addEventListener("keydown", keydownHandler);

      const beforeUnloadHandler = () => { stopAllAudio(); };
      const unloadHandler = () => { stopAllAudio(); };
      window.addEventListener("beforeunload", beforeUnloadHandler);
      window.addEventListener("unload", unloadHandler);

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
        document.removeEventListener("keydown", keydownHandler);
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        window.removeEventListener("unload", unloadHandler);
        unbind.forEach((f) => f());
        clearInterval(timerInterval);
        clearTimeout(prepareTimeout);
        clearTimeout(recordingTimeout);
        stopAllAudio();
      };
}
