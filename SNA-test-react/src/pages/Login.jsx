import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { ROUTES } from '../routes/routes'
import { AppShell, Button, Card } from '../components/ui'
import './styles/login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || ROUTES.HOME

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const message =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : err.code === 'auth/invalid-email'
            ? 'Please enter a valid email address.'
            : err.code === 'auth/too-many-requests'
              ? 'Too many attempts. Try again later.'
              : err.message || 'Sign in failed. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="login-page">
        <Card className="login-card">
          <div className="login-logo-wrap">
            <div className="login-logo-circle">
              <img src="/assets/sna-icon-bird.png" alt="SNA" className="login-logo-img" />
            </div>
          </div>
          <h1 className="login-title">SNA English Test</h1>
          <p className="login-subtitle">Practice makes perfect</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label">
              Email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="login-input"
                disabled={submitting}
              />
            </label>
            <label className="login-label">
              Password *
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="login-input"
                disabled={submitting}
              />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="login-footer">
            Don&apos;t have an account? <Link to={ROUTES.SIGNUP} className="login-link">Sign Up</Link>
          </p>
        </Card>
      </div>
    </AppShell>
  )
}
