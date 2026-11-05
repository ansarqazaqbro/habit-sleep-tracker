import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { LiquidCard } from '../liquid/LiquidCard'

/**
 * Modal for creating a habit with a title and category tags (many-to-many).
 */
export function NewHabitModal({ open, categories, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setTitle('')
    setSelected([])
    setError('')
  }

  function close() {
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
    if (!title.trim()) {
      setError('Укажите название привычки')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ title: title.trim(), category_ids: selected })
      reset()
    } catch (err) {
      setError(err.message || 'Не удалось сохранить привычку')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="glass-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
            <LiquidCard hoverScale={false} className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Новая привычка</h2>
                <button
                  type="button"
                  onClick={close}
                  className="liquid-glass-pill p-2"
                  aria-label="Закрыть"
                >
                  <X size={16} />
                </button>
              </div>

              <form className="space-y-5" onSubmit={submit}>
                <label className="block text-sm">
                  Название
                  <input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Например: холодный душ"
                    maxLength={120}
                    className="glass-input mt-1"
                  />
                </label>

                <div>
                  <p className="mb-2 text-sm">Категории</p>
                  {categories.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">Категорий пока нет.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Категории">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="tag-chip"
                          aria-pressed={selected.includes(category.id)}
                          style={{ '--tag-color': category.color }}
                          onClick={() => toggleCategory(category.id)}
                        >
                          <span className="tag-chip__dot" />
                          {category.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <LiquidButton type="button" onClick={close}>
                    Отмена
                  </LiquidButton>
                  <LiquidButton type="submit" disabled={saving}>
                    {saving ? 'Сохраняем…' : 'Создать'}
                  </LiquidButton>
                </div>
              </form>
            </LiquidCard>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
