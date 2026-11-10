import { useMemo, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'

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
    <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#ededed]">Быстрая запись сна</h3>
      <form className="space-y-3.5" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[#71717a]">
            Засыпание
            <input
              type="time"
              required
              value={bed}
              onChange={(event) => setBed(event.target.value)}
              className="glass-input mt-1"
            />
          </label>
          <label className="text-xs text-[#71717a]">
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

        <div className="flex items-center justify-between rounded-lg border border-[#222225] bg-[#121214] px-3 py-2 text-xs">
          <span className="text-[#71717a]">Длительность</span>
          <span className="font-mono font-medium text-[#ededed]">
            {summary.label} · {summary.percent}% от 8 ч
          </span>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-[#71717a]">Качество сна: {quality}/5</p>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Оценка качества сна">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={quality === score}
                aria-label={`Оценка ${score}`}
                onClick={() => setQuality(score)}
                className={`rounded-md border py-2 font-mono text-xs font-medium transition-colors ${
                  quality === score
                    ? 'border-[#ededed] bg-[#ededed] text-[#09090b]'
                    : 'border-[#222225] bg-[#121214] text-[#71717a] hover:border-[#3f3f46] hover:text-[#ededed]'
                }`}
              >
                {score}/5
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className={`text-xs ${error ? 'text-red-400' : 'text-[#a1a1aa]'}`}>
            {error || message}
          </p>
          <LiquidButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить ночь'}
          </LiquidButton>
        </div>
      </form>
    </div>
  )
}
