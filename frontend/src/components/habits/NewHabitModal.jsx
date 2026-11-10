import { Check, Plus, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'

const PRESET_HABITS = [
  { title: 'Дыхание 4-7-8 (21:40)', days: 7 },
  { title: 'Чтение бумажной книги 20 мин', days: 6 },
  { title: 'Стакан воды 400 мл (07:30)', days: 7 },
  { title: 'Без экранов за 1 ч до сна', days: 7 },
]

export function NewHabitModal({ open, categories = [], onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [targetDays, setTargetDays] = useState(7)
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  function reset() {
    setTitle('')
    setTargetDays(7)
    setSelected([])
    setError('')
  }

  function close() {
    if (saving) return
    reset()
    onClose()
  }

  function toggleCategory(id) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function submit(event) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Укажите название привычки')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        title: cleanTitle,
        target_frequency: Number(targetDays),
        target_days_per_week: Number(targetDays),
        category_ids: selected,
      })
      reset()
    } catch (err) {
      setError(err.message || 'Не удалось сохранить привычку')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-modal-backdrop" onClick={close}>
      <div
        className="w-full max-w-md rounded-xl border border-[#27272a] bg-[#0d0d0e] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[#222225] pb-3.5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#fafafa]">
              Новая привычка
            </h2>
            <p className="mt-0.5 text-xs text-[#a1a1aa]">
              Добавьте ежедневный ритуал и укажите целевую частоту на неделю
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272a] bg-[#141417] text-[#a1a1aa] hover:text-[#fafafa]"
            aria-label="Закрыть"
          >
            <X size={15} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="habit-title-input" className="block text-xs font-medium text-[#a1a1aa]">
              Название привычки
            </label>
            <input
              id="habit-title-input"
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (error) setError('')
              }}
              placeholder="Например: Дыхание 4-7-8"
              maxLength={120}
              className="glass-input mt-1.5"
            />
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#a1a1aa]">
              <Sparkles size={12} /> Быстрые шаблоны
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_HABITS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setTitle(preset.title)
                    setTargetDays(preset.days)
                    setError('')
                  }}
                  className="tag-chip text-left text-xs"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#a1a1aa]">
              Цель (дней в неделю): <span className="font-mono text-[#fafafa]">{targetDays}/7</span>
            </p>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5" role="group" aria-label="Цель дней в неделю">
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTargetDays(days)}
                  className={`h-9 rounded-lg border font-mono text-xs font-semibold transition-colors ${
                    targetDays === days
                      ? 'border-[#fafafa] bg-[#fafafa] text-[#09090b]'
                      : 'border-[#27272a] bg-[#141417] text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#fafafa]'
                  }`}
                >
                  {days} дн.
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[#a1a1aa]">Категории</p>
            {categories.length === 0 ? (
              <p className="text-xs text-[#71717a]">Категории будут назначены автоматически.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Категории">
                {categories.map((category) => {
                  const isSelected = selected.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      className="tag-chip"
                      aria-pressed={isSelected}
                      onClick={() => toggleCategory(category.id)}
                    >
                      {isSelected ? <Check size={11} /> : <span className="tag-chip__dot" />}
                      {category.title || category.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-[#222225] pt-3.5">
            <LiquidButton type="button" variant="ghost" onClick={close} disabled={saving}>
              Отмена
            </LiquidButton>
            <LiquidButton
              type="submit"
              variant="primary"
              disabled={saving}
              className="min-w-[130px]"
            >
              <Plus size={14} />
              <span>{saving ? 'Сохранение…' : 'Создать'}</span>
            </LiquidButton>
          </div>
        </form>
      </div>
    </div>
  )
}
