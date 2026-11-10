import { Bot, CheckSquare, MoonStar } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { unlockAudio } from '../../lib/sound'

export function AppShell({ tab, setTab, user, onOpenAdvisor, children }) {
  return (
    <div className="min-h-svh bg-[#000000] text-[#ededed]" onPointerDown={unlockAudio}>
      <div className="mx-auto flex max-w-[1280px] gap-5 px-4 py-4 pb-20 lg:px-6">
        <aside className="hidden w-60 shrink-0 flex-col justify-between rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-3.5 md:flex">
          <div>
            <div className="mb-6 flex items-center justify-between border-b border-[#222225] px-1.5 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md border border-[#2e2e33] bg-[#121214] font-mono text-xs font-bold text-[#ededed]">
                  L
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none tracking-tight text-[#ededed]">
                    Lumen
                  </p>
                  <p className="mt-1 text-[11px] leading-none text-[#71717a]">Habit & Sleep</p>
                </div>
              </div>
              <span className="rounded border border-[#222225] bg-[#121214] px-1.5 py-0.5 font-mono text-[10px] text-[#71717a]">
                v2.0
              </span>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'habits', label: 'Привычки', icon: CheckSquare },
                { id: 'sleep', label: 'Трекер сна', icon: MoonStar },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                    tab === item.id
                      ? 'border-[#2e2e33] bg-[#121214] text-[#ededed]'
                      : 'border-transparent text-[#71717a] hover:bg-[#121214] hover:text-[#ededed]'
                  }`}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}

              {onOpenAdvisor ? (
                <button
                  type="button"
                  onClick={onOpenAdvisor}
                  className="mt-2 flex w-full items-center gap-2.5 rounded-lg border border-[#222225] bg-[#121214] px-3 py-2 text-left text-xs font-medium text-[#ededed] transition-colors hover:border-[#3f3f46]"
                >
                  <Bot size={15} />
                  AI-консультант Lumen
                </button>
              ) : null}
            </nav>
          </div>

          <div className="mt-8 border-t border-[#222225] px-1.5 pt-3 text-xs">
            <div className="font-medium text-[#ededed]">{user?.name || 'Aurora'}</div>
            <div className="truncate text-[11px] text-[#71717a]">
              {user?.email || 'demo@habit.local'}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#222225] bg-[#0d0d0e] px-3.5 py-2.5">
            <div className="flex gap-1.5 md:hidden">
              <button
                type="button"
                className="rounded-md border border-[#222225] bg-[#121214] px-2.5 py-1 text-xs"
                onClick={() => setTab('habits')}
              >
                Привычки
              </button>
              <button
                type="button"
                className="rounded-md border border-[#222225] bg-[#121214] px-2.5 py-1 text-xs"
                onClick={() => setTab('sleep')}
              >
                Сон
              </button>
              {onOpenAdvisor ? (
                <button
                  type="button"
                  className="rounded-md border border-[#222225] bg-[#121214] px-2.5 py-1 text-xs"
                  onClick={onOpenAdvisor}
                >
                  AI-консультант
                </button>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 text-xs text-[#71717a] md:flex">
              <span className="font-medium text-[#ededed]">Lumen Workspace</span>
              <span>·</span>
              <span>Минимум визуального шума, фокус на дисциплине</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          <div>{children}</div>
        </main>
      </div>
    </div>
  )
}
