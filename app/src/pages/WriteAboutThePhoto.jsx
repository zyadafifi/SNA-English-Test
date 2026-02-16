import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { init } from '../legacy/write-about-the-photo.legacy'
import { getNextQuizUrl } from '../legacy/skills-config.legacy'
import './styles/write-about-the-photo.css'

export default function WriteAboutThePhoto() {
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
            <h1 className="question-title" id="questionTitle">Write a description of the image below for 1 minute</h1>
            <div className="content-container">
              <div className="photo-container">
                <img src="" alt="Photo to describe" className="photo-image" id="photoImage" />
              </div>
              <div className="text-input-container">
                <textarea className="response-textarea" id="responseTextarea" placeholder="Your response" maxLength={500} />
                <div className="char-counter" id="charCounter">0/500</div>
              </div>
            </div>
            <button type="button" className="continue-btn" id="continueBtn">CONTINUE</button>
          </div>
        </div>
        <div className="feedback-section" id="feedbackSection">
          <div className="feedback-header">
            <svg className="feedback-icon" id="feedbackIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="16,8 10,14 8,12" />
            </svg>
            <div className="feedback-title" id="feedbackTitle">Review sample answer:</div>
          </div>
          <div className="sample-answer-text" id="sampleAnswerText" />
        </div>
        <div className="results-screen" id="resultsScreen">
          <div className="results-icons">
            <div className="result-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20,6 9,17 4,12" /></svg></div>
          </div>
          <div className="results-title">Practice complete! You</div>
          <div className="results-subtitle">improved your writing skills.</div>
          <div className="results-buttons">
            <button type="button" className="continue-btn" id="resultsContinueBtn">CONTINUE</button>
            <button type="button" className="done-btn">DONE</button>
          </div>
        </div>
      </div>
    </div>
  )
}
