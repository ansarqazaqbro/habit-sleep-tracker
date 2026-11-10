import { MessageSquare, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { api } from '../../lib/api'

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
    <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#71717a]">
            <Sparkles size={13} /> Сводка · AI-консультант Lumen
          </p>
          {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          {advice ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[#ededed]">{advice.summary}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#71717a]">
                {advice.recommendation}
              </p>
            </>
          ) : loading ? (
            <p className="mt-2 text-xs text-[#71717a]">Анализируем вашу неделю…</p>
          ) : null}
        </div>
        {advice ? (
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-[#222225] bg-[#121214] font-mono text-base font-semibold text-[#ededed]"
            aria-label={`Общий балл ${advice.score} из 100`}
          >
            {advice.score}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#18181b] pt-3">
        {onOpenAdvisor ? (
          <LiquidButton variant="primary" onClick={onOpenAdvisor}>
            <MessageSquare size={14} />
            Открыть AI-консультант Lumen
          </LiquidButton>
        ) : null}
        <LiquidButton onClick={load} disabled={loading}>
          {loading ? 'Обновление…' : 'Обновить сводку'}
        </LiquidButton>
      </div>
    </div>
  )
}
