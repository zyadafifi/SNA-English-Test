/**
 * Card – Wrapper to standardize rounded corners + background when needed.
 * Forwards className and props; does not override existing classnames.
 * Use to wrap existing card-like divs while keeping their classes intact.
 */
export default function Card({ children, className = '', ...rest }) {
  return (
    <div className={className.trim() || undefined} {...rest}>
      {children}
    </div>
  )
}
