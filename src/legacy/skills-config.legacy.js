/**
 * Skill order and URLs - React route paths (replaces .html paths).
 * Same keys and logic as original skills-config.js; only URLs changed.
 */
import { ROUTES, QUIZ_ROUTE_ORDER } from '../routes/routes'

const skillNames = [
  'Read and Select',
  'Fill in the Blanks',
  'Read and Complete',
  'Listen and Type',
  'Write About the Photo',
  'Speak About the Photo',
  'Read, Then Speak',
  'Interactive Reading',
  'Interactive Listening',
  'Writing Sample',
  'Speaking Sample'
]

export const SKILLS_ORDER = skillNames.map((name, i) => ({
  name,
  url: QUIZ_ROUTE_ORDER[i] || ROUTES.HOME
}))

export function getNextQuizUrl(currentSkillName) {
  const idx = SKILLS_ORDER.findIndex((s) => s.name === currentSkillName)
  if (idx === -1 || idx >= SKILLS_ORDER.length - 1) return null
  return SKILLS_ORDER[idx + 1].url
}

export function isSkillCompleted(skillName) {
  try {
    const stored = localStorage.getItem('skillProgress')
    if (!stored) return false
    const allProgress = JSON.parse(stored)
    const p = allProgress[skillName]
    return p && p.completed >= p.total
  } catch (e) {
    return false
  }
}
