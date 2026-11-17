import { Component, useCallback, useEffect, useState } from 'react'
import { AiAdvisorWidget } from './components/ai/AiAdvisorWidget'
import { AppShell } from './components/layout/AppShell'
import { HabitsDashboard } from './components/habits/HabitsDashboard'
import { LiquidLensFilters } from './components/liquid/LiquidLensFilters'
import { SleepDashboard } from './components/sleep/SleepDashboard'
import { ThemeProvider } from './context/ThemeContext'
import { api, ensureSession } from './lib/api'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Неизвестная ошибка интерфейса' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-svh place-items-center bg-[#000000] p-6 text-[#ededed]">
          <div className="w-full max-w-md rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-5">
            <h2 className="text-base font-semibold text-[#fafafa]">Ошибка отображения</h2>
            <p className="mt-2 text-xs text-[#a1a1aa]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-[#fafafa] bg-[#fafafa] px-3.5 py-2 text-xs font-semibold text-[#09090b]"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

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
    setHabits(toArray(nextHabits))
    setMatrix(nextMatrix?.data ?? nextMatrix ?? null)
    setSleepStats(nextStats?.data ?? nextStats ?? null)
    setCategories(toArray(nextCategories))
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
    <AppErrorBoundary>
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
              {error}. Проверьте, что в Open Server Panel запущены домен{' '}
              <code>http://habit-sleep-tracker.local</code> и модуль базы данных (MySQL).
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
    </AppErrorBoundary>
  )
}
