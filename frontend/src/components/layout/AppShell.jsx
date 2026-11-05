import { AnimatePresence, motion } from 'framer-motion'
import { Bot, MoonStar, Sparkles } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { unlockAudio } from '../../lib/sound'

export function AppShell({ tab, setTab, user, onOpenAdvisor, children }) {
  return (
    <div className="relative min-h-svh" onPointerDown={unlockAudio}>
      <div className="scene-bg" aria-hidden="true">
        <motion.div
          className="scene-bg__orb"
          style={{ width: 420, height: 420, left: '8%', top: '12%', background: 'var(--orb-a)' }}
          animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="scene-bg__orb"
          style={{ width: 520, height: 520, right: '-6%', top: '-8%', background: 'var(--orb-b)' }}
          animate={{ x: [0, -30, 10, 0], y: [0, 50, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="scene-bg__orb"
          style={{ width: 360, height: 360, left: '40%', bottom: '-10%', background: 'var(--orb-c)' }}
          animate={{ x: [0, 20, -40, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1280px] gap-5 px-4 py-5 pb-24 lg:px-8">
        <aside className="liquid-glass-card hidden w-64 shrink-0 p-4 md:block">
          <div className="liquid-glass-card__content">
            <div className="mb-8 flex items-center gap-3 px-2 pt-2">
              <div className="liquid-glass-pill grid h-10 w-10 place-items-center">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">Lumen</p>
                <p className="text-xs text-[var(--muted)]">Habit & Sleep</p>
              </div>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'habits', label: 'Привычки', icon: Sparkles },
                { id: 'sleep', label: 'Сон', icon: MoonStar },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    tab === item.id
                      ? 'liquid-glass-pill font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}

              {onOpenAdvisor ? (
                <button
                  type="button"
                  onClick={onOpenAdvisor}
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition liquid-glass-pill"
                  style={{ color: 'var(--accent)' }}
                >
                  <Bot size={16} />
                  AI-консультант
                </button>
              ) : null}
            </nav>

            <div className="mt-10 px-2 text-xs text-[var(--muted)]">
              {user?.name || 'Aurora'}
              <div className="truncate">{user?.email || 'demo@habit.local'}</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 md:hidden">
              <button
                type="button"
                className="liquid-glass-pill px-3 py-2 text-sm"
                onClick={() => setTab('habits')}
              >
                Привычки
              </button>
              <button
                type="button"
                className="liquid-glass-pill px-3 py-2 text-sm"
                onClick={() => setTab('sleep')}
              >
                Сон
              </button>
              {onOpenAdvisor ? (
                <button
                  type="button"
                  className="liquid-glass-pill px-3 py-2 text-sm"
                  style={{ color: 'var(--accent)' }}
                  onClick={onOpenAdvisor}
                >
                  AI
                </button>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
