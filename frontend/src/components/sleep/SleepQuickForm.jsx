import { useMemo, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { LiquidCard } from '../liquid/LiquidCard'

const FACES = ['😫', '😕', '😐', '😊', '🤩']
const GOAL_MINUTES = 480

function duration(bed, wake) {
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let minutes = wh * 60 + wm - (bh * 60 + bm)
  if (minutes <= 0) minutes += 24 * 60
  return {
    minutes,
    label: `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`,
    percent: Math.min(100, Math.round((minutes / GOAL_MINUTES) * 100)),
  }
}

function todayLocal() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Inline quick sleep log: bed time, wake time, 1–5 quality rating.
 */
export function SleepQuickForm({ onSave }) {
  const [bed, setBed] = useState('23:30')
  const [wake, setWake] = useState('07:30')
  const [quality, setQuality] = useState(4)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const summary = useMemo(() => duration(bed, wake), [bed, wake])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await onSave({
        bed_time: bed,
        wake_time: wake,
        quality_rating: quality,
        date: todayLocal(),
      })
      setMessage('Ночь сохранена')
    } catch (err) {
      setError(err.message || 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LiquidCard hoverScale={false} className="p-5">
      <h3 className="mb-4 text-lg font-semibold">Быстрая запись сна</h3>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Засыпание
            <input
              type="time"
              required
              value={bed}
              onChange={(event) => setBed(event.target.value)}
              className="glass-input mt-1"
            />
          </label>
          <label className="text-sm">
            Пробуждение
            <input
              type="time"
              required
              value={wake}
              onChange={(event) => setWake(event.target.value)}
              className="glass-input mt-1"
            />
          </label>
        </div>

        <div className="liquid-glass-pill px-4 py-2 text-sm">
          {summary.label} · {summary.percent}% от цели 8 ч
        </div>

        <div>
          <p className="mb-2 text-sm">Качество сна: {quality}/5</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Оценка качества сна">
            {FACES.map((face, index) => (
              <button
                key={face}
                type="button"
                role="radio"
                aria-checked={quality === index + 1}
                aria-label={`Оценка ${index + 1}`}
                onClick={() => setQuality(index + 1)}
                className={`liquid-glass-pill h-11 w-11 text-lg transition-transform ${
                  quality === index + 1 ? 'scale-110 bg-white/25' : ''
                }`}
              >
                {face}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm ${error ? 'text-rose-300' : 'text-[var(--good)]'}`}>
            {error || message}
          </p>
          <LiquidButton type="submit" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить ночь'}
          </LiquidButton>
        </div>
      </form>
    </LiquidCard>
  )
}
