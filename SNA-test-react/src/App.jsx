import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from './routes/routes'
import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import ProtectedRoute from './auth/ProtectedRoute'
import { AppShell } from './components/ui'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Logout from './pages/Logout'
import ReadAndSelect from './pages/ReadAndSelect'
import FillInTheBlanks from './pages/FillInTheBlanks'
import ReadAndComplete from './pages/ReadAndComplete'
import ListenAndType from './pages/ListenAndType'
import WriteAboutThePhoto from './pages/WriteAboutThePhoto'
import SpeakAboutThePhoto from './pages/SpeakAboutThePhoto'
import ReadThenSpeak from './pages/ReadThenSpeak'
import InteractiveReading from './pages/InteractiveReading'
import InteractiveListening from './pages/InteractiveListening'
import WritingSample from './pages/WritingSample'
import SpeakingSample from './pages/SpeakingSample'

/** Shown while auth state is resolving (onAuthStateChanged). */
function AuthLoadingScreen() {
  return (
    <AppShell>
      <div className="auth-loading" aria-live="polite">
        <div className="auth-loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    </AppShell>
  )
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Home />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.SIGNUP} element={<Signup />} />
      <Route path={ROUTES.LOGOUT} element={<Logout />} />
      {/* Quiz and practice routes require login */}
      <Route
        path={ROUTES.READ_AND_SELECT}
        element={
          <ProtectedRoute>
            <ReadAndSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.FILL_IN_THE_BLANKS}
        element={
          <ProtectedRoute>
            <FillInTheBlanks />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.READ_AND_COMPLETE}
        element={
          <ProtectedRoute>
            <ReadAndComplete />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.LISTEN_AND_TYPE}
        element={
          <ProtectedRoute>
            <ListenAndType />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.WRITE_ABOUT_THE_PHOTO}
        element={
          <ProtectedRoute>
            <WriteAboutThePhoto />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SPEAK_ABOUT_THE_PHOTO}
        element={
          <ProtectedRoute>
            <SpeakAboutThePhoto />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.READ_THEN_SPEAK}
        element={
          <ProtectedRoute>
            <ReadThenSpeak />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.INTERACTIVE_READING}
        element={
          <ProtectedRoute>
            <InteractiveReading />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.INTERACTIVE_LISTENING}
        element={
          <ProtectedRoute>
            <InteractiveListening />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.WRITING_SAMPLE}
        element={
          <ProtectedRoute>
            <WritingSample />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SPEAKING_SAMPLE}
        element={
          <ProtectedRoute>
            <SpeakingSample />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
