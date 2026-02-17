import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { init } from '../legacy/speak-about-the-photo.legacy'
import { getNextQuizUrl } from '../legacy/skills-config.legacy'
import './styles/speak-about-the-photo.css'

export default function SpeakAboutThePhoto() {
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
        <div><div className="loading-spinner" /><div className="loading-text">Loading quiz data...</div></div>
      </div>
      <div className="error-screen" id="errorScreen">
        <div className="error-title">Failed to Load Quiz Data</div>
        <div className="error-message" id="errorMessage">Could not load the quiz questions. Please check your internet connection and try again.</div>
        <button type="button" className="retry-data-btn">Retry</button>
        <button type="button" className="retry-data-btn" style={{ background: '#f0f0f0', color: '#666', marginLeft: '10px' }}>Go Back</button>
      </div>
      <div className="quiz-container" id="quizContainer" style={{ display: 'none' }}>
        <div className="question-card" id="questionCard">
          <div className="timer" id="timer">
            <svg className="timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
            </svg>
            <span id="timerText">0:00</span>
          </div>
          <button type="button" className="close-btn">&lt; BACK</button>
          <div className="stage-progress-bar">
            <div className="progress-track"><div className="progress-fill" id="stageProgressFill" /></div>
            <span className="progress-text" id="stageProgressText">0/3</span>
          </div>
          <div className="question-content" id="questionContent">
            <h1 className="question-title" id="questionTitle">Describe the photo</h1>
            <p className="question-subtitle" id="questionSubtitle">You have 15 seconds to prepare, then record your answer.</p>
            <div className="photo-container">
              <img src="" alt="Describe" className="photo-image" id="photoImage" />
            </div>
            <button type="button" className="record-button" id="recordButton">
              <span id="recordButtonText">RECORD NOW</span>
            </button>
            <div className="audio-visualizer" id="audioVisualizer" style={{ display: 'none' }} />
            <button type="button" className="continue-btn" id="continueBtn" style={{ display: 'none' }}>CONTINUE</button>
          </div>
          <div className="review-section" id="reviewSection" style={{ display: 'none' }}>
            <div className="review-header">
              <svg className="review-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><polyline points="16,8 10,14 8,12" /></svg>
              <div className="review-title">Review your answer</div>
            </div>
            <div className="review-buttons">
              <button type="button" className="sample-btn" id="sampleBtn">
                <svg className="play-icon" id="samplePlayIcon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                <svg className="stop-icon" id="sampleStopIcon" style={{ display: 'none' }} viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
                <span id="sampleBtnText">SAMPLE</span>
              </button>
              <button type="button" className="recording-btn" id="recordingBtn">
                <svg className="play-icon" id="recordingPlayIcon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                <svg className="stop-icon" id="recordingStopIcon" style={{ display: 'none' }} viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
                <span id="recordingBtnText">YOUR RECORDING</span>
              </button>
            </div>
          </div>
        </div>
        <div className="results-screen" id="resultsScreen">
          <div className="results-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20,6 9,17 4,12" /></svg></div>
          <div className="results-title">Practice complete! You</div>
          <div className="results-subtitle">improved your speaking skills.</div>
          <div className="results-buttons">
            <button type="button" className="continue-btn" id="resultsContinueBtn">CONTINUE</button>
            <button type="button" className="done-btn">DONE</button>
          </div>
        </div>
      </div>
      <audio id="sampleAudio" preload="auto" />
      <audio id="recordingAudio" preload="auto" />
    </div>
  )
}
