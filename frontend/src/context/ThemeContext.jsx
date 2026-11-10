import { createContext } from 'react'

const ThemeContext = createContext({
  theme: 'monochrome',
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ theme: 'monochrome', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}
