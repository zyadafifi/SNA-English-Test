/**
 * Minimal DOM helpers for legacy quiz scripts.
 * Use containerEl (root) for all queries to avoid cross-page collisions.
 * Records listeners and timers for cleanup.
 */

export function qs(root, sel) {
  if (!root) return null
  return root.querySelector(sel)
}

export function qsa(root, sel) {
  if (!root) return []
  return Array.from(root.querySelectorAll(sel))
}

export function byId(root, id) {
  if (!root) return null
  return root.querySelector(`[id="${id}"]`) || document.getElementById(id)
}

const listeners = []
const timers = []

export function on(el, event, handler) {
  if (!el) return
  el.addEventListener(event, handler)
  listeners.push({ el, event, handler })
}

export function addTimer(fn, delay) {
  const id = setTimeout(fn, delay)
  timers.push(id)
  return id
}

export function addInterval(fn, delay) {
  const id = setInterval(fn, delay)
  timers.push(id)
  return id
}

export function createCleanup() {
  const myListeners = []
  const myTimers = []
  return {
    on(el, event, handler) {
      if (!el) return
      el.addEventListener(event, handler)
      myListeners.push({ el, event, handler })
    },
    addTimer(fn, delay) {
      const id = setTimeout(fn, delay)
      myTimers.push(id)
      return id
    },
    addInterval(fn, delay) {
      const id = setInterval(fn, delay)
      myTimers.push(id)
      return id
    },
    cleanup() {
      myListeners.forEach(({ el, event, handler }) => {
        try { el.removeEventListener(event, handler); } catch (_) {}
      })
      myTimers.forEach(id => {
        try { clearTimeout(id); clearInterval(id); } catch (_) {}
      })
    }
  }
}

export function cleanupAll() {
  listeners.forEach(({ el, event, handler }) => {
    try { el.removeEventListener(event, handler); } catch (_) {}
  })
  listeners.length = 0
  timers.forEach(id => {
    try { clearTimeout(id); clearInterval(id); } catch (_) {}
  })
  timers.length = 0
}
