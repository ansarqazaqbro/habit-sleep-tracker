import { playGlassClick } from '../../lib/sound'

export function LiquidButton({
  children,
  className = '',
  variant = 'secondary',
  type = 'button',
  onClick,
  sound = false,
  ...props
}) {
  const variantClass =
    variant === 'primary'
      ? 'lumen-btn--primary'
      : variant === 'ghost'
        ? 'lumen-btn--ghost'
        : ''

  return (
    <button
      type={type}
      className={`liquid-btn ${variantClass} ${className}`}
      onClick={(event) => {
        if (sound) playGlassClick()
        onClick?.(event)
      }}
      {...props}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  )
}
