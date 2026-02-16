/**
 * ProgressBar – Wrapper for progress markup. Accepts children as the exact inner structure
 * (e.g. .progress-track + .progress-fill, .progress-text) so legacy selectors still work.
 * Forwards className and props.
 */
export default function ProgressBar({ children, className = '', ...rest }) {
  return (
    <div className={className.trim() || undefined} {...rest}>
      {children}
    </div>
  )
}
