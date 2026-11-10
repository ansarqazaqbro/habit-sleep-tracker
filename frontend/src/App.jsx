import { useCallback, useEffect, useState } from 'react'
import { AiAdvisorWidget } from './components/ai/AiAdvisorWidget'
import { AppShell } from './components/layout/AppShell'
import { HabitsDashboard } from './components/habits/HabitsDashboard'
import { LiquidLensFilters } from './components/liquid/LiquidLensFilters'
import { SleepDashboard } from './components/sleep/SleepDashboard'
import { ThemeProvider } from './context/ThemeContext'
import { api, ensureSession } from './lib/api'

export default function App() {
  const [tab, setTab] = useState('habits')
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [habits, setHabits] = useState([])
  const [categories, setCategories] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [sleepStats, setSleepStats] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [nextHabits, nextMatrix, nextStats, nextCategories] = await Promise.all([
      api.habits(),
      api.matrix(),
      api.sleepStats(),
      api.categories(),
    ])
    setHabits(nextHabits?.data ?? nextHabits ?? [])
    setMatrix(nextMatrix?.data ?? nextMatrix)
    setSleepStats(nextStats?.data ?? nextStats)
    setCategories(nextCategories?.data ?? nextCategories ?? [])
  }, [])

  useEffect(() => {
    ensureSession()
      .then((profile) => {
        setUser(profile)
        return refresh()
      })
      .catch((err) => setError(err.message || 'Не удалось подключить API'))
  }, [refresh])

  return (
    <ThemeProvider>
      <LiquidLensFilters />
      <AppShell
        tab={tab}
        setTab={setTab}
        user={user}
        onOpenAdvisor={() => setAdvisorOpen(true)}
      >
        {error ? (
          <div className="liquid-glass-card p-6">
            {error}. Проверьте, что в Open Server Panel запущен домен{' '}
            <code>http://habit-sleep-tracker.local</code>.
          </div>
        ) : tab === 'sleep' ? (
          <SleepDashboard
            stats={sleepStats}
            onRefresh={refresh}
            onOpenAdvisor={() => setAdvisorOpen(true)}
          />
        ) : (
          <HabitsDashboard
            habits={habits}
            categories={categories}
            matrix={matrix}
            onRefresh={refresh}
            onHabitsChange={setHabits}
            onOpenAdvisor={() => setAdvisorOpen(true)}
          />
        )}
      </AppShell>

      <AiAdvisorWidget
        open={advisorOpen}
        onOpen={() => setAdvisorOpen(true)}
        onClose={() => setAdvisorOpen(false)}
        sleepStats={sleepStats}
        habits={habits}
        matrix={matrix}
        onRefreshData={refresh}
        onHabitsChange={setHabits}
      />
    </ThemeProvider>
  )
}
