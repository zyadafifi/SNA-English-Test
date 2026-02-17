import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { init } from '../legacy/writing-sample.legacy'
import { getNextQuizUrl } from '../legacy/skills-config.legacy'
import './styles/writing-sample.css'

export default function WritingSample() {
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
        <button type="button" className="retry-btn">Retry</button>
        <button type="button" className="retry-btn" style={{ background: '#f0f0f0', color: '#666' }}>Go Back</button>
      </div>
      <div className="quiz-container" id="quizContainer" style={{ display: 'none' }}>
        <div className="question-card" id="questionCard">
          <div className="timer" id="timer" style={{ display: 'none' }}>
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
          <div className="preparation-stage" id="preparationStage">
            <h1 className="preparation-title" id="preparationTitle" />
            <p className="preparation-subtitle" id="preparationSubtitle" />
            <div className="topic-card"><div className="topic-text" id="topicText" /></div>
            <button type="button" className="continue-btn active" id="preparationContinue">CONTINUE</button>
          </div>
          <div className="writing-stage" id="writingStage" style={{ display: 'none' }}>
            <h1 className="writing-title" id="writingTitle" />
            <p className="writing-topic" id="writingTopic" />
            <textarea className="writing-area" id="writingArea" placeholder="Your response" />
            <button type="button" className="continue-btn" id="writingContinue">CONTINUE</button>
          </div>
          <div className="results-stage" id="resultsStage" style={{ display: 'none' }}>
            <h1 className="results-title" id="resultsTitle" />
            <p className="results-topic" id="resultsTopic" />
            <div className="user-response" id="userResponse" />
            <div className="sample-answer">
              <div className="sample-header">
                <svg className="sample-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="16,8 10,14 8,12" />
                </svg>
                <h3 className="sample-title" id="sampleTitle" />
              </div>
              <div className="sample-text" id="sampleText" />
            </div>
            <div className="results-buttons">
              <button type="button" className="continue-btn outline" id="resultsContinueBtn">CONTINUE</button>
              <button type="button" className="continue-btn yellow done-btn">DONE</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
