import { motion } from 'framer-motion'
import { useState } from 'react'

/**
 * Glass card with optical edge refraction, a pointer-following gradient rim and an
 * inner glow. All visuals live in the `.liquid-glass-card--optic` class (liquid.css).
 */
export function LiquidCard({
  as: Tag = motion.div,
  className = '',
  children,
  hoverScale = true,
  onClick,
}) {
  const [spot, setSpot] = useState({ x: 28, y: 16, angle: 135 })

  return (
    <Tag
      className={`liquid-glass-card liquid-glass-card--optic liquid-lens ${className}`}
      style={{
        '--spot-x': `${spot.x}%`,
        '--spot-y': `${spot.y}%`,
        '--rim-angle': `${spot.angle}deg`,
      }}
      onMouseMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - box.left) / box.width) * 100
        const y = ((event.clientY - box.top) / box.height) * 100
        // Angle from the card centre to the pointer drives the conic rim highlight.
        const angle = (Math.atan2(y - 50, x - 50) * 180) / Math.PI + 90
        setSpot({ x, y, angle })
      }}
      onClick={onClick}
      whileHover={hoverScale ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 280, damping: 22, mass: 0.7 }}
    >
      <div className="liquid-glass-card__refract" />
      <div className="liquid-glass-card__chroma" />
      <div className="liquid-glass-card__specular" />
      <div className="liquid-glass-card__content">{children}</div>
    </Tag>
  )
}
