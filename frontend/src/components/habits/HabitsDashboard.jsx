import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { ActivityMatrix } from './ActivityMatrix'
import { HabitCard } from './HabitCard'
import { NewHabitModal } from './NewHabitModal'
import { api } from '../../lib/api'
import { playGlassClick } from '../../lib/sound'

export function HabitsDashboard({ habits, categories, matrix, onRefresh }) {
  const [open, setOpen] = useState(false)

  async function createHabit(payload) {
    await api.createHabit(payload)
    setOpen(false)
    await onRefresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Сегодня</p>
          <h1 className="text-3xl font-semibold tracking-tight">Привычки</h1>
        </div>
        <LiquidButton onClick={() => setOpen(true)}>
          <Plus size={16} /> Новая привычка
        </LiquidButton>
      </div>

      <NewHabitModal
        open={open}
        categories={categories}
        onClose={() => setOpen(false)}
        onSave={createHabit}
      />

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {habits.map((habit) => (
          <motion.div
            key={habit.id}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          >
            <HabitCard
              habit={habit}
              onToggle={async (item) => {
                playGlassClick()
                await api.toggleHabit(item.id)
                onRefresh()
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      <ActivityMatrix matrix={matrix} />
    </div>
  )
}
