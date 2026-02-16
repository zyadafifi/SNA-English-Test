/**
 * AppShell – Wraps the page. Responsible only for background + consistent outer container.
 * Does not change layout; use for future background or shell-level styling if needed.
 * Preserves all child structure and classes.
 */
export default function AppShell({ children, className = '', ...rest }) {
  return (
    <div className={`app-shell ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}
