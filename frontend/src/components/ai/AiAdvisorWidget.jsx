import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  CheckCircle2,
  Lightbulb,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { LiquidCard } from '../liquid/LiquidCard'
import { api } from '../../lib/api'

const QUICK_PROMPTS = [
  'Разбери мою неделю: что улучшить в первую очередь?',
  'Как стабилизировать подъём в 07:00 без недосыпа?',
  'Какие вечерние привычки помогут засыпать быстрее?',
  'Почему падает регулярность моих привычек к концу недели?',
]

/**
 * Вычисляет процент выполнения привычек за последние 7 дней по матрице активности.
 */
function calcWeeklyHabitPercent(matrix, habits) {
  const days = matrix?.days
  if (Array.isArray(days) && days.length > 0) {
    const last7 = days.slice(-7)
    const completed = last7.reduce((sum, d) => sum + (Number(d.completed) || 0), 0)
    const total = last7.reduce((sum, d) => sum + (Number(d.total) || 0), 0)
    if (total > 0) {
      return Math.min(100, Math.round((completed / total) * 100))
    }
  }
  if (Array.isArray(habits) && habits.length > 0) {
    const doneToday = habits.filter((h) => h.completed_today).length
    return Math.round((doneToday / habits.length) * 100)
  }
  return undefined
}

/**
 * Плавающий liquid-glass виджет и окно чата/рекомендаций «Спросить AI-консультанта» (Google Gemini).
 */
export function AiAdvisorWidget({ open, onOpen, onClose, sleepStats, habits, matrix }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [messages, setMessages] = useState([])
  const chatEndRef = useRef(null)

  const currentStats = useMemo(() => {
    const avgSleepHours =
      typeof sleepStats?.average_hours === 'number' ? sleepStats.average_hours : undefined
    const avgSleepQuality =
      typeof sleepStats?.average_quality === 'number' && sleepStats.average_quality > 0
        ? sleepStats.average_quality
        : undefined
    const habitCompletionPercent = calcWeeklyHabitPercent(matrix, habits)

    return {
      avg_sleep_hours: avgSleepHours,
      avg_sleep_quality: avgSleepQuality,
      habit_completion_percent: habitCompletionPercent,
    }
  }, [sleepStats, matrix, habits])

  const askAdvisor = useCallback(
    async (userQuestion = '', currentHistory = []) => {
      setLoading(true)
      setError('')

      const trimmed = userQuestion.trim()
      const nextHistory = trimmed
        ? [...currentHistory, { role: 'user', text: trimmed }]
        : currentHistory

      if (trimmed) {
        setMessages(nextHistory)
      }

      try {
        const res = await api.aiAdvisor({
          ...currentStats,
          ...(trimmed ? { question: trimmed } : {}),
          history: currentHistory.slice(-8),
        })

        setReport(res)
        setMessages([
          ...nextHistory,
          {
            role: 'assistant',
            text: res.reply,
            insights: res.insights || [],
            recommendations: res.recommendations || [],
            score: res.score,
            source: res.source,
            model: res.model,
          },
        ])
      } catch (err) {
        setError(err.message || 'Не удалось связаться с AI-консультантом')
      } finally {
        setLoading(false)
      }
    },
    [currentStats],
  )

  // При первом открытии автоматически запрашиваем персональный разбор недели
  useEffect(() => {
    if (open && !report && !loading && messages.length === 0) {
      askAdvisor('', [])
    }
  }, [open, report, loading, messages.length, askAdvisor])

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, loading, open])

  function handleSubmit(event) {
    event.preventDefault()
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')
    askAdvisor(
      q,
      messages.map(({ role, text }) => ({ role, text })),
    )
  }

  function handleQuickPrompt(promptText) {
    if (loading) return
    askAdvisor(
      promptText,
      messages.map(({ role, text }) => ({ role, text })),
    )
  }

  const displayStats = report?.stats || {
    avg_sleep_hours: currentStats.avg_sleep_hours ?? 0,
    avg_sleep_quality: currentStats.avg_sleep_quality ?? 0,
    habit_completion_percent: currentStats.habit_completion_percent ?? 0,
    sleep_regularity_percent: sleepStats?.regularity ?? 0,
  }

  return (
    <>
      {/* Плавающая кнопка в правом нижнем углу */}
      <div className="fixed right-5 bottom-5 z-40">
        <LiquidButton
          onClick={onOpen}
          className="px-4 py-3 text-sm font-medium shadow-2xl"
          style={{
            boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.55), 0 0 28px var(--glow)',
          }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span>Спросить AI-консультанта</span>
          {report?.score != null ? (
            <span
              className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'var(--glass-strong)', color: 'var(--accent)' }}
            >
              {report.score}
            </span>
          ) : null}
        </LiquidButton>
      </div>

      {/* Модальное окно AI-консультанта */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="glass-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="w-full max-w-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(event) => event.stopPropagation()}
            >
              <LiquidCard hoverScale={false} className="max-h-[88svh] overflow-y-auto p-6">
                {/* Заголовок */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="liquid-glass-pill grid h-11 w-11 shrink-0 place-items-center"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Bot size={22} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold tracking-tight">
                          AI-консультант Lumen
                        </h2>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                          style={{
                            background: 'var(--glass-strong)',
                            border: '1px solid var(--line)',
                            color: 'var(--accent)',
                          }}
                        >
                          {report?.source === 'gemini'
                            ? `Google Gemini · ${report.model || 'Flash'}`
                            : 'Google Gemini AI'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        Персональный анализ сна, привычек и продуктивности за последние 7 дней
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => askAdvisor('', [])}
                      disabled={loading}
                      className="liquid-glass-pill p-2 text-xs"
                      title="Обновить разбор"
                      aria-label="Обновить разбор"
                    >
                      <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="liquid-glass-pill p-2"
                      aria-label="Закрыть"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Сводка входной статистики пользователя + общий балл */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="liquid-glass-pill rounded-2xl px-3.5 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      Средний сон
                    </p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {displayStats.avg_sleep_hours ?? 0} ч
                    </p>
                  </div>
                  <div className="liquid-glass-pill rounded-2xl px-3.5 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      Качество сна
                    </p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {displayStats.avg_sleep_quality ?? 0}/5
                    </p>
                  </div>
                  <div className="liquid-glass-pill rounded-2xl px-3.5 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      Привычки (7 дн.)
                    </p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {displayStats.habit_completion_percent ?? 0}%
                    </p>
                  </div>
                  <div className="liquid-glass-pill rounded-2xl px-3.5 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      Индекс баланса
                    </p>
                    <p
                      className="mt-0.5 text-lg font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      {report?.score != null ? `${report.score}/100` : '—'}
                    </p>
                  </div>
                </div>

                {/* Карточка инсайтов и рекомендаций по последнему ответу Gemini */}
                {report ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Array.isArray(report.insights) && report.insights.length > 0 ? (
                      <div
                        className="rounded-2xl p-3.5"
                        style={{
                          background: 'var(--glass-strong)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                          <Lightbulb size={14} style={{ color: 'var(--accent)' }} />
                          Инсайты по вашим данным
                        </p>
                        <ul className="space-y-1.5 text-xs leading-relaxed">
                          {report.insights.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span style={{ color: 'var(--accent)' }}>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {Array.isArray(report.recommendations) && report.recommendations.length > 0 ? (
                      <div
                        className="rounded-2xl p-3.5"
                        style={{
                          background: 'var(--glass-strong)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                          <CheckCircle2 size={14} style={{ color: 'var(--good)' }} />
                          Персональные рекомендации
                        </p>
                        <ul className="space-y-1.5 text-xs leading-relaxed">
                          {report.recommendations.map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span style={{ color: 'var(--good)' }}>✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Лента диалога с консультантом */}
                <div
                  className="mt-4 max-h-60 space-y-3 overflow-y-auto rounded-2xl p-3.5"
                  style={{
                    background: 'var(--glass-strong)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {messages.length === 0 && loading ? (
                    <div className="flex items-center gap-2.5 py-4 text-sm text-[var(--muted)]">
                      <Sparkles size={16} className="animate-pulse" />
                      <span>Gemini анализирует ваш режим сна и выполнение привычек…</span>
                    </div>
                  ) : null}

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                        style={
                          msg.role === 'user'
                            ? {
                                background:
                                  'linear-gradient(135deg, rgba(126,224,255,0.22), rgba(192,132,252,0.18))',
                                border: '1px solid var(--line)',
                              }
                            : {
                                background: 'var(--glass)',
                                border: '1px solid var(--line)',
                              }
                        }
                      >
                        <p className="mb-1 text-[11px] font-medium text-[var(--muted)]">
                          {msg.role === 'user' ? 'Вы' : 'AI-консультант Gemini'}
                        </p>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {messages.length > 0 && loading ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Sparkles size={14} className="animate-pulse" />
                      <span>Консультант формулирует ответ…</span>
                    </div>
                  ) : null}

                  <div ref={chatEndRef} />
                </div>

                {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}

                {/* Быстрые вопросы */}
                <div className="mt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <MessageSquarePlus size={13} /> Быстрые вопросы к консультанту:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickPrompt(promptText)}
                        className="tag-chip text-left text-xs"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Форма отправки своего вопроса */}
                <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Задайте вопрос о вашем сне, режиме или привычках…"
                    maxLength={1000}
                    className="glass-input flex-1 text-sm"
                  />
                  <LiquidButton
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="shrink-0 px-4"
                  >
                    <Send size={15} />
                    <span>{loading ? 'Ждём…' : 'Спросить'}</span>
                  </LiquidButton>
                </form>
              </LiquidCard>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
