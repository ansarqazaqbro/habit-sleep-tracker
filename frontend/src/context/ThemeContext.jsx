import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEMES = [
  { id: 'vision-dark', label: 'Тёмная' },
  { id: 'vision-light', label: 'Светлая' },
  { id: 'aurora', label: 'Аврора (неон)' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('lumen.theme') || 'vision-dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lumen.theme', theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme, themes: THEMES }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('ThemeProvider missing')
  return ctx
}
