import { motion } from 'framer-motion'
import { playGlassClick } from '../../lib/sound'

export function LiquidButton({
  children,
  className = '',
  type = 'button',
  onClick,
  sound = true,
  ...props
}) {
  return (
    <motion.button
      type={type}
      className={`liquid-glass-pill liquid-btn ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      onClick={(event) => {
        if (sound) playGlassClick()
        onClick?.(event)
      }}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
