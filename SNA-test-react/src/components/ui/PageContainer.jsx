/**
 * PageContainer – Handles max-width + horizontal padding (matches existing app layout).
 * Use as wrapper for page content. Preserves all child structure and classes.
 * Uses .ui-page-container for layout (see ui.css).
 */
export default function PageContainer({ children, className = '', ...rest }) {
  return (
    <div className={`ui-page-container ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}
