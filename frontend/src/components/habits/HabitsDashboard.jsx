import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { ActivityMatrix } from './ActivityMatrix'
import { HabitCard } from './HabitCard'
import { NewHabitModal } from './NewHabitModal'
import { api } from '../../lib/api'

function buildOptimisticHabit(payload, categories = []) {
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek)

  const days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const iso = d.toISOString().slice(0, 10)
    return {
      date: iso,
      done: false,
      future: idx > dayOfWeek,
    }
  })

  const target = Number(payload.target_days_per_week || payload.target_frequency || 7)
  const matchedCategories = categories.filter((c) => (payload.category_ids || []).includes(c.id))

  return {
    id: Date.now(),
    title: payload.title,
    target_frequency: target,
    target_days_per_week: target,
    streak_count: 0,
    streak: 0,
    best_streak: 0,
    accent: '#e4e4e7',
    color: '#e4e4e7',
    is_active: true,
    completed_today: false,
    completed_this_week: 0,
    week: {
      completed: 0,
      target,
      days,
    },
    categories: matchedCategories,
  }
}

export function HabitsDashboard({
  habits,
  categories,
  matrix,
  onRefresh,
  onHabitsChange,
  onOpenAdvisor,
}) {
  const [open, setOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDays, setQuickDays] = useState(7)
  const [quickSaving, setQuickSaving] = useState(false)

  const safeHabits = Array.isArray(habits) ? habits : []
  const safeCategories = Array.isArray(categories) ? categories : []

  const completedToday = safeHabits.filter((h) => h.completed_today).length
  const totalActive = safeHabits.length
  const weeklyDone = safeHabits.reduce(
    (acc, h) => acc + (h.completed_this_week ?? h.week?.completed ?? 0),
    0,
  )
  const weeklyTarget = safeHabits.reduce(
    (acc, h) => acc + (h.target_days_per_week ?? h.week?.target ?? h.target_frequency ?? 7),
    0,
  )

  async function createHabit(payload) {
    try {
      const response = await api.createHabit(payload)
      const created = response?.data ?? response
      if (created && created.id) {
        onHabitsChange?.((prev) => {
          const list = Array.isArray(prev) ? prev : []
          const exists = list.some((item) => item.id === created.id)
          return exists ? list.map((item) => (item.id === created.id ? created : item)) : [...list, created]
        })
      }
      setOpen(false)
      await onRefresh?.()
      return created
    } catch {
      const fallback = buildOptimisticHabit(payload, safeCategories)
      onHabitsChange?.((prev) => [...(Array.isArray(prev) ? prev : []), fallback])
      setOpen(false)
      return fallback
    }
  }

  async function handleQuickSubmit(event) {
    event.preventDefault()
    const trimmed = quickTitle.trim()
    if (!trimmed || quickSaving) return

    setQuickSaving(true)
    try {
      await createHabit({
        title: trimmed,
        target_frequency: Number(quickDays),
        target_days_per_week: Number(quickDays),
        category_ids: safeCategories[0] ? [safeCategories[0].id] : [],
      })
      setQuickTitle('')
      setQuickDays(7)
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222225] pb-3.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
            Ежедневная дисциплина
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#fafafa]">
            Привычки и ритуалы
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAdvisor ? (
            <LiquidButton type="button" onClick={onOpenAdvisor}>
              <Sparkles size={14} className="shrink-0" />
              <span>AI-консультант Lumen</span>
            </LiquidButton>
          ) : null}
          <LiquidButton type="button" variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} className="shrink-0" />
            <span>Новая привычка</span>
          </LiquidButton>
        </div>
      </div>

      {/* High-density summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] px-3.5 py-2.5">
          <div className="text-xs font-medium text-[#a1a1aa]">Выполнено сегодня</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#fafafa]">
            {completedToday}/{totalActive}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] px-3.5 py-2.5">
          <div className="text-xs font-medium text-[#a1a1aa]">Прогресс недели</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#fafafa]">
            {weeklyDone}/{weeklyTarget} дн.
          </div>
        </div>
        <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] px-3.5 py-2.5">
          <div className="text-xs font-medium text-[#a1a1aa]">Лучшая серия</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#fafafa]">
            🔥 {safeHabits.reduce((max, h) => Math.max(max, h.best_streak || 0), 0)} дн.
          </div>
        </div>
        <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] px-3.5 py-2.5">
          <div className="text-xs font-medium text-[#a1a1aa]">Активных привычек</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#fafafa]">{totalActive}</div>
        </div>
      </div>

      {/* Quick inline habit creation bar (shadcn style) */}
      <form
        onSubmit={handleQuickSubmit}
        className="flex flex-wrap items-center gap-2 overflow-hidden rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-2.5 sm:flex-nowrap"
      >
        <input
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          placeholder="Быстрое добавление привычки (например: Медитация 10 мин или Чтение перед сном)…"
          maxLength={120}
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-[#27272a] bg-[#121214] px-3 text-xs font-medium text-[#fafafa] placeholder:text-[#71717a] focus:border-[#52525b] focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <select
            value={quickDays}
            onChange={(event) => setQuickDays(Number(event.target.value))}
            aria-label="Целевое количество дней в неделю"
            className="h-10 rounded-lg border border-[#27272a] bg-[#121214] px-2.5 font-mono text-xs font-medium text-[#fafafa] focus:border-[#52525b] focus:outline-none"
          >
            {[7, 6, 5, 4, 3, 2, 1].map((d) => (
              <option key={d} value={d}>
                {d}/7 дн.
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={quickSaving || !quickTitle.trim()}
            className="inline-flex h-10 w-[135px] min-w-[135px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#fafafa] bg-[#fafafa] px-3 text-xs font-semibold text-[#09090b] transition-opacity hover:bg-[#e4e4e7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {quickSaving ? (
              <>
                <Loader2 className="inline-block h-4 w-4 shrink-0 animate-spin" />
                <span>Создание…</span>
              </>
            ) : (
              <>
                <Plus className="inline-block h-4 w-4 shrink-0" />
                <span>Добавить</span>
              </>
            )}
          </button>
        </div>
      </form>

      <NewHabitModal
        open={open}
        categories={safeCategories}
        onClose={() => setOpen(false)}
        onSave={createHabit}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {safeHabits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggle={async (item, date) => {
              try {
                const updated = await api.toggleHabit(item.id, date)
                const nextHabit = updated?.data ?? updated
                if (nextHabit && nextHabit.id) {
                  onHabitsChange?.((prev) =>
                    prev.map((h) => (h.id === nextHabit.id ? nextHabit : h)),
                  )
                }
                await onRefresh?.()
              } catch {
                onHabitsChange?.((prev) =>
                  prev.map((h) =>
                    h.id === item.id
                      ? {
                          ...h,
                          completed_today: !h.completed_today,
                          completed_this_week: Math.max(
                            0,
                            (h.completed_this_week || 0) + (h.completed_today ? -1 : 1),
                          ),
                          streak_count: Math.max(
                            0,
                            (h.streak_count || 0) + (h.completed_today ? -1 : 1),
                          ),
                        }
                      : h,
                  ),
                )
              }
            }}
            onDelete={async (item) => {
              onHabitsChange?.((prev) => prev.filter((h) => h.id !== item.id))
              try {
                await api.deleteHabit(item.id)
                await onRefresh?.()
              } catch {
                // Already removed optimistically
              }
            }}
          />
        ))}

        {/* Card button to open NewHabitModal */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#27272a] bg-[#0a0a0c] p-4 text-xs font-semibold text-[#a1a1aa] transition-colors hover:border-[#52525b] hover:bg-[#121214] hover:text-[#fafafa]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#27272a] bg-[#141417] text-[#fafafa]">
            <Plus size={16} />
          </span>
          <span>Создать новую привычку</span>
        </button>
      </div>

      <ActivityMatrix matrix={matrix} />
    </div>
  )
}
