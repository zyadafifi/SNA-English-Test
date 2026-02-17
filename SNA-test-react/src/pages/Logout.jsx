import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { ROUTES } from '../routes/routes'

/**
 * Logout page: signs out and redirects to home.
 * Can be linked from header or used as route /logout.
 */
export default function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    signOut(auth).then(() => {
      navigate(ROUTES.HOME, { replace: true })
    })
  }, [navigate])

  return (
    <div className="logout-page" aria-live="polite">
      Signing out…
    </div>
  )
}
