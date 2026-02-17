import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/** Hook to read auth state: { user, loading }. Must be used inside AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context == null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
