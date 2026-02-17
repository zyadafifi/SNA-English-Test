/**
 * Icon – Wrapper around <img> (or inline SVG later). Forwards all props.
 * Does not set size unless explicitly passed (width/height in props).
 */
export default function Icon({ alt = '', ...rest }) {
  return <img alt={alt} {...rest} />
}
