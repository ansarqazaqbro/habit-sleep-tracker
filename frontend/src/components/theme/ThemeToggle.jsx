import { Droplets, MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { playGlassClick } from '../../lib/sound'

const ICONS = {
  'vision-dark': MoonStar,
  'vision-light': SunMedium,
  aurora: Droplets,
}

export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="liquid-glass-pill flex p-1">
      {themes.map((item) => {
        const Icon = ICONS[item.id]
        const active = theme === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? 'bg-white/20 text-[var(--text)]' : 'text-[var(--muted)]'
            }`}
            onClick={() => {
              playGlassClick()
              setTheme(item.id)
            }}
          >
            <Icon size={14} />
            <span className="hidden xl:inline">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
