import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { ROUTES } from '../routes/routes'
import { AppShell, Button, Card } from '../components/ui'
import './styles/login.css'

const MIN_PASSWORD_LENGTH = 6

function getFriendlyError(code, message) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already in use. Sign in or use a different email.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-up is not enabled. Contact support.'
    default:
      return message || 'Sign up failed. Please try again.'
  }
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || ROUTES.HOME

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getFriendlyError(err.code, err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <div className="login-page">
        <Card className="login-card">
          <h1 className="login-title">Create an account</h1>
          <p className="login-subtitle">Sign up with your email and a password (at least 6 characters).</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label">
              Email
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
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="login-input"
                disabled={submitting}
              />
            </label>
            <label className="login-label">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="login-input"
                disabled={submitting}
              />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="login-footer">
            Already have an account? <Link to={ROUTES.LOGIN} className="login-link">Sign in</Link>
          </p>
        </Card>
      </div>
    </AppShell>
  )
}
