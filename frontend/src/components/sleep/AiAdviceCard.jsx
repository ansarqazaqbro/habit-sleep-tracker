import { MessageSquare, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { LiquidCard } from '../liquid/LiquidCard'
import { api } from '../../lib/api'

/**
 * Personal AI advice: {"summary": "...", "recommendation": "...", "score": 85}
 */
export function AiAdviceCard({ refreshKey, onOpenAdvisor }) {
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAdvice(await api.aiAdvice())
    } catch (err) {
      setError(err.message || 'Не удалось получить совет')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <LiquidCard hoverScale={false} className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            <Sparkles size={14} /> ИИ-совет · Google Gemini
          </p>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          {advice ? (
            <>
              <p className="mt-2 text-base leading-relaxed">{advice.summary}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {advice.recommendation}
              </p>
            </>
          ) : loading ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Анализируем вашу неделю…</p>
          ) : null}
        </div>
        {advice ? (
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-semibold"
            style={{
              background: `conic-gradient(var(--accent) ${advice.score * 3.6}deg, rgba(255,255,255,0.1) 0)`,
            }}
            aria-label={`Общий балл ${advice.score} из 100`}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--glass-strong)]">
              {advice.score}
            </span>
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {onOpenAdvisor ? (
          <LiquidButton onClick={onOpenAdvisor}>
            <MessageSquare size={15} />
            Спросить AI-консультанта
          </LiquidButton>
        ) : null}
        <LiquidButton onClick={load} disabled={loading}>
          {loading ? 'Думаем…' : 'Обновить совет'}
        </LiquidButton>
      </div>
    </LiquidCard>
  )
}
