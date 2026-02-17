import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { ROUTES } from '../routes/routes'

/**
 * Renders children only when user is authenticated.
 * Redirects to /login and preserves the intended URL in state.from for post-login redirect.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null // App-level loading UI handles this
  }

  if (!user) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}
