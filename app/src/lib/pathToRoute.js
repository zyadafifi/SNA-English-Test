/**
 * Maps original .html paths to React routes for legacy script compatibility.
 */
import { ROUTES } from '../routes/routes'

const HTML_TO_ROUTE = {
  'index.html': ROUTES.HOME,
  '': ROUTES.HOME,
  'read and select.html': ROUTES.READ_AND_SELECT,
  'fill in the blanks.html': ROUTES.FILL_IN_THE_BLANKS,
  'read and complete.html': ROUTES.READ_AND_COMPLETE,
  'listen and type.html': ROUTES.LISTEN_AND_TYPE,
  'write about the photo.html': ROUTES.WRITE_ABOUT_THE_PHOTO,
  'speak about the photo.html': ROUTES.SPEAK_ABOUT_THE_PHOTO,
  'read then speak.html': ROUTES.READ_THEN_SPEAK,
  'interactive reading.html': ROUTES.INTERACTIVE_READING,
  'interactive listening.html': ROUTES.INTERACTIVE_LISTENING,
  'writing sample.html': ROUTES.WRITING_SAMPLE,
  'speaking sample.html': ROUTES.SPEAKING_SAMPLE,
}

/**
 * @param {string} path - Original path (e.g. "read and select.html" or "/read-and-select")
 * @returns {string} React route path
 */
export function pathToRoute(path) {
  if (!path) return ROUTES.HOME
  const trimmed = path.trim()
  if (HTML_TO_ROUTE[trimmed] !== undefined) return HTML_TO_ROUTE[trimmed]
  // Already a route path (e.g. from getQuizUrlForSkill in React config)
  if (trimmed.startsWith('/')) return trimmed
  return ROUTES.HOME
}
