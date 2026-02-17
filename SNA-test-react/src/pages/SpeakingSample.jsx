import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { init } from '../legacy/speaking-sample.legacy'
import { getNextQuizUrl } from '../legacy/skills-config.legacy'
import './styles/speaking-sample.css'

export default function SpeakingSample() {
  const rootRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const cleanup = init(el, { navigate, getNextQuizUrl })
    return () => { if (typeof cleanup === 'function') cleanup() }
  }, [navigate])

  return (
    <div ref={rootRef}>
      <div className="loading-screen" id="loadingScreen">
        <div>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading quiz data...</div>
        </div>
      </div>

      <div className="error-screen" id="errorScreen">
        <div className="error-title">Failed to Load Quiz Data</div>
        <div className="error-message" id="errorMessage">
          Could not load the quiz questions. Please check your internet connection
          and try again.
        </div>
        <button type="button" className="retry-data-btn">Retry</button>
        <button
          type="button"
          className="retry-data-btn"
          style={{ background: '#f0f0f0', color: '#666', marginLeft: '10px' }}
        >
          Go Back
        </button>
      </div>

      <div className="quiz-container" id="quizContainer" style={{ display: 'none' }}>
        <div className="question-card" id="questionCard">
          <div className="timer" id="timer">
            <svg
              className="timer-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span id="timerText">0:00</span>
          </div>

          <button type="button" className="close-btn">&lt; BACK</button>

          <div className="stage-progress-bar">
            <div className="progress-track">
              <div className="progress-fill" id="stageProgressFill"></div>
            </div>
            <span className="progress-text" id="stageProgressText">0/3</span>
          </div>

          <div className="question-content" id="questionContent">
            <h1 className="question-title" id="questionTitle">
              Prepare to speak about the topic below
            </h1>

            <p className="question-subtitle" id="questionSubtitle">
              You will have 3 minutes to speak
            </p>

            <div className="topic-container">
              <div className="topic-text" id="topicText">Loading question...</div>
            </div>

            <button type="button" className="record-button" id="recordButton">
              <span className="mic-icon">
                <svg height="24" width="24" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.5055 0.921631C9.29632 0.921631 7.50546 2.71249 7.50546 4.92163V10.5029C7.50546 12.712 9.29632 14.5029 11.5055 14.5029H12.4973C14.7065 14.5029 16.4973 12.712 16.4973 10.5029V4.92163C16.4973 2.71249 14.7065 0.921631 12.4973 0.921631H11.5055ZM19.9809 12.4921C19.9809 11.9398 19.5332 11.4921 18.9809 11.4921C18.4286 11.4921 17.9809 11.9398 17.9809 12.4921C17.9809 14.924 16.0058 16.8983 13.566 16.8983H10.3052C7.93658 16.8983 6.01913 14.9816 6.01913 12.6206C6.01913 12.0683 5.57141 11.6206 5.01913 11.6206C4.46684 11.6206 4.01913 12.0683 4.01913 12.6206C4.01913 16.0892 6.83503 18.8983 10.3052 18.8983H10.9789V21.0783H10.2096C9.65732 21.0783 9.2096 21.526 9.2096 22.0783C9.2096 22.6305 9.65732 23.0783 10.2096 23.0783H13.9125C14.4648 23.0783 14.9125 22.6305 14.9125 22.0783C14.9125 21.526 14.4648 21.0783 13.9125 21.0783H12.9789V18.8983H13.566C17.1073 18.8983 19.9809 16.0316 19.9809 12.4921Z"
                    fill="currentcolor"
                  />
                </svg>
              </span>
              <span id="recordButtonText">RECORD NOW</span>
            </button>

            <div className="recording-status" id="recordingStatus">
              <div className="recording-dot"></div>
              <span>RECORDING...</span>
            </div>

            <button type="button" className="continue-btn" id="continueBtn">
              CONTINUE
            </button>
          </div>
        </div>

        <div className="review-section" id="reviewSection">
          <div className="review-header">
            <svg
              className="review-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="16,8 10,14 8,12" />
            </svg>
            <div className="review-title">Review sample answer:</div>
          </div>

          <div className="review-buttons">
            <button type="button" className="sample-btn" id="sampleBtn">
              <svg className="play-icon" id="samplePlayIcon" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
              <svg
                className="stop-icon"
                id="sampleStopIcon"
                viewBox="0 0 24 24"
                style={{ display: 'none' }}
              >
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <span id="sampleBtnText">SAMPLE</span>
            </button>
            <button type="button" className="recording-btn" id="recordingBtn">
              <svg className="play-icon" id="recordingPlayIcon" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
              <svg
                className="stop-icon"
                id="recordingStopIcon"
                viewBox="0 0 24 24"
                style={{ display: 'none' }}
              >
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <span id="recordingBtnText">YOUR RECORDING</span>
            </button>
          </div>

          <button type="button" className="continue-review-btn" id="continueReviewBtn">
            CONTINUE
          </button>
        </div>

        <div className="results-screen" id="resultsScreen">
          <div className="results-icon">
            <svg viewBox="0 0 24 24">
              <path d="M8 5V19L19 12L8 5Z" />
            </svg>
          </div>
          <div className="results-title">Practice completed! You</div>
          <div className="results-subtitle">improved your speaking skills.</div>
          <div className="results-buttons">
            <button type="button" className="results-continue-btn" id="resultsContinueBtn">CONTINUE</button>
            <button type="button" className="done-btn" id="doneBtn">DONE</button>
          </div>
        </div>
      </div>

      <audio id="sampleAudio" preload="auto"></audio>
      <audio id="recordingAudio" preload="auto"></audio>
    </div>
  )
}
