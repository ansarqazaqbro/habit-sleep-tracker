import { Check, Trash2 } from 'lucide-react'
import { playHabitPop } from '../../lib/sound'

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function HabitCard({ habit, onToggle, onDelete }) {
  const categories = Array.isArray(habit?.categories) ? habit.categories : []
  const completed =
    habit.completed_this_week ?? habit.week?.completed ?? (habit.completed_today ? 1 : 0)
  const target =
    habit.target_days_per_week ?? habit.week?.target ?? habit.target_frequency ?? 7
  const percent = Math.min(100, Math.round((completed / Math.max(1, target)) * 100))
  const streak = habit.streak_count ?? habit.streak ?? 0
  const weekDays = Array.isArray(habit?.week?.days) ? habit.week.days : []

  return (
    <div className="flex flex-col justify-between rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4 transition-colors hover:border-[#2e2e33]">
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <span
                    key={category.id}
                    className="rounded border border-[#222225] bg-[#121214] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#71717a]"
                  >
                    {category.title || category.name}
                  </span>
                ))
              ) : (
                <span className="rounded border border-[#222225] bg-[#121214] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                  Ритуал
                </span>
              )}
            </div>

            <h3 className="mt-2 truncate text-[15px] font-semibold tracking-tight text-[#ededed]">
              {habit.title}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-md border border-[#222225] bg-[#121214] px-2 py-0.5 text-xs font-medium text-[#ededed]"
              title={`Лучшая серия: ${habit.best_streak || 0} дн.`}
            >
              🔥 {streak} дн.
            </span>

            <button
              type="button"
              onClick={() => {
                playHabitPop()
                onToggle(habit)
              }}
              aria-label="Отметить привычку"
              className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
                habit.completed_today
                  ? 'border-[#ededed] bg-[#ededed] text-[#09090b]'
                  : 'border-[#222225] bg-[#121214] text-[#71717a] hover:border-[#3f3f46] hover:text-[#ededed]'
              }`}
            >
              <Check size={15} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {weekDays.length === 7 ? (
          <div className="mt-3.5 grid grid-cols-7 gap-1">
            {weekDays.map((day, idx) => (
              <button
                key={day.date}
                type="button"
                disabled={day.future}
                onClick={() => onToggle(habit, day.date)}
                title={`${WEEKDAY_SHORT[idx]} (${day.date})`}
                className={`flex flex-col items-center rounded border py-1 text-[10px] transition-colors ${
                  day.done
                    ? 'border-zinc-500 bg-zinc-200 font-semibold text-zinc-950'
                    : day.future
                      ? 'cursor-default border-[#18181b] bg-[#0a0a0b] text-zinc-700'
                      : 'border-[#222225] bg-[#121214] text-[#71717a] hover:border-[#3f3f46] hover:text-[#ededed]'
                }`}
              >
                <span>{WEEKDAY_SHORT[idx]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[#18181b] pt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[#71717a]">Недельный план</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-[#ededed]">
              {completed}/{target} дн.
            </span>
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(habit)}
                title="Удалить привычку"
                className="text-[#71717a] transition-colors hover:text-[#ededed]"
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-200 transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
