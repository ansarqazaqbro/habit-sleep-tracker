import { Check, Flame } from 'lucide-react'
import { LiquidButton } from '../liquid/LiquidButton'
import { LiquidCard } from '../liquid/LiquidCard'
import { playHabitPop } from '../../lib/sound'

export function HabitCard({ habit, onToggle }) {
  const categories = habit.categories || []

  return (
    <LiquidCard className="p-5" hoverScale>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-h-5 flex-wrap gap-1.5">
            {categories.map((category) => (
              <span
                key={category.id}
                className="tag-chip !cursor-default !px-2 !py-0.5 !text-[10px] uppercase tracking-[0.12em]"
                style={{ '--tag-color': category.color }}
              >
                <span className="tag-chip__dot" />
                {category.title}
              </span>
            ))}
          </div>
          <h3 className="mt-2 text-lg font-semibold">{habit.title}</h3>
        </div>
        <div className="liquid-glass-pill shrink-0 px-3 py-1 text-sm">
          <Flame size={14} className="mr-1 inline text-orange-300" />
          {habit.streak_count} дн.
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">лучшая серия {habit.best_streak}</p>
        <LiquidButton
          sound={false}
          className={`h-11 w-11 ${habit.completed_today ? 'bg-[var(--good)]/30' : ''}`}
          onClick={() => {
            playHabitPop()
            onToggle(habit)
          }}
          aria-label="Отметить привычку"
        >
          <Check size={18} />
        </LiquidButton>
      </div>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"
        style={{ boxShadow: `0 0 12px ${habit.accent}55` }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: habit.completed_today ? '100%' : '12%',
            background: habit.accent,
          }}
        />
      </div>
    </LiquidCard>
  )
}
