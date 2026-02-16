/**
 * Central helper for quiz JSON data URLs.
 * Uses Vite's BASE_URL so paths work in dev and when deployed with a base path.
 */
const base = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : '';

export function getQuizDataUrl(filename) {
  return `${base}/data/${filename}`;
}
