import { createContext } from 'react'

/** Auth context: { user, loading }. Set by AuthProvider via onAuthStateChanged. */
export const AuthContext = createContext(null)
