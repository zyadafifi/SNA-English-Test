/**
 * Button – Pure wrapper around <button>. Forwards className and all props.
 * Does not enforce styling; use when you want a single component for buttons without changing behavior.
 */
export default function Button({ className = '', type = 'button', children, ...rest }) {
  return (
    <button type={type} className={className.trim() || undefined} {...rest}>
      {children}
    </button>
  )
}
