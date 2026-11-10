/**
 * Minimalist monochrome card container (#0d0d0e surface, #222225 border).
 * Zero cursor glow, zero optical refraction, zero hover scale bounce.
 */
export function LiquidCard({
  as: Tag = 'div',
  className = '',
  children,
  onClick,
}) {
  return (
    <Tag className={`liquid-glass-card ${className}`} onClick={onClick}>
      <div className="liquid-glass-card__content">{children}</div>
    </Tag>
  )
}
