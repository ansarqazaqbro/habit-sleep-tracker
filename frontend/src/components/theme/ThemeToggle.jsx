import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
      title={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      className={`group relative inline-flex h-8 items-center gap-2 rounded-full border px-1.5 pr-3 text-[11px] font-medium transition-all duration-300 ease-out cursor-pointer select-none ${
        isLight
          ? 'border-[#d4d4d8] bg-[#ffffff] text-[#18181b] shadow-sm hover:border-[#a1a1aa]'
          : 'border-[#27272a] bg-[#121214] text-[#d4d4d8] hover:border-[#3f3f46] hover:text-[#fafafa]'
      }`}
    >
      <span
        className={`relative flex h-5 w-10 items-center rounded-full p-0.5 transition-colors duration-300 ease-out ${
          isLight ? 'bg-[#e4e4e7]' : 'bg-[#27272a]'
        }`}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full shadow-sm transition-all duration-300 ease-out ${
            isLight
              ? 'translate-x-5 bg-[#18181b] text-[#fafafa]'
              : 'translate-x-0 bg-[#fafafa] text-[#09090b]'
          }`}
        >
          {isLight ? (
            <Sun size={10} className="transition-transform duration-300 rotate-0" />
          ) : (
            <Moon size={10} className="transition-transform duration-300 rotate-0" />
          )}
        </span>
      </span>

      <span className="tracking-tight transition-colors duration-300">
        {isLight ? 'Светлая' : 'Тёмная'}
      </span>
    </button>
  )
}
