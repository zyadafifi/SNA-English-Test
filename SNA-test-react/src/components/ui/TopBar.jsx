/**
 * TopBar – Wrapper for page title + optional left/right slots.
 * Does not hardcode markup; passes through title and slots so existing structure is preserved.
 * Use: <TopBar left={...} title={...} right={...} /> or pass children for custom layout.
 */
export default function TopBar({ left, title, right, children, className = '', ...rest }) {
  if (children != null) {
    return (
      <div className={`top-bar ${className}`.trim()} {...rest}>
        {children}
      </div>
    )
  }
  return (
    <div className={`top-bar ${className}`.trim()} {...rest}>
      {left != null && <div className="top-bar-left">{left}</div>}
      {title != null && <div className="top-bar-title">{title}</div>}
      {right != null && <div className="top-bar-right">{right}</div>}
    </div>
  )
}
