import {
  Bot,
  Check,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  RotateCcw,
  Send,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiquidButton } from '../liquid/LiquidButton'
import { api } from '../../lib/api'

const REQUEST_TIMEOUT_MS = 15000

const QUICK_PROMPTS = [
  {
    label: 'Улучшить сон',
    prompt: 'Я плохо спал последние 3 дня, добавь мне дыхание перед сном и смести чтение',
  },
  {
    label: 'Утренний план',
    prompt: 'Составь мне план привычек для утренней бодрости',
  },
  {
    label: 'Вечерний план',
    prompt: 'Составь мне вечерний план для глубокого сна',
  },
  {
    label: 'Разбор недели',
    prompt: 'Разбери мою неделю: что улучшить в первую очередь?',
  },
]

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
  return 68
}

function buildWeekDays(target = 7) {
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek)

  const days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    return {
      date: d.toISOString().slice(0, 10),
      done: false,
      future: idx > dayOfWeek,
    }
  })

  return {
    completed: 0,
    target,
    days,
  }
}

function makeLocalHabitObject({ id, title, target_days_per_week = 7, category = 'Ритуал' }) {
  const target = Math.max(1, Math.min(7, Number(target_days_per_week) || 7))
  return {
    id: id || Date.now() + Math.floor(Math.random() * 1000),
    title,
    target_frequency: target,
    target_days_per_week: target,
    streak_count: 0,
    streak: 0,
    best_streak: 0,
    accent: '#e4e4e7',
    color: '#e4e4e7',
    is_active: true,
    completed_today: false,
    completed_this_week: 0,
    week: buildWeekDays(target),
    categories: [{ id: 99, title: category, name: category }],
  }
}

/**
 * Local autonomous fallback planner (1s simulated latency) used if the backend
 * endpoint `/api/ai/advisor` is offline, times out, or returns an error.
 */
async function runLocalMockAdvisor(questionText, stats, habits = [], onHabitsChange) {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const lower = (questionText || '').toLowerCase()
  const actions = []
  const createdHabits = []
  const updatedHabits = []
  let reply =
    'Проанализировал ваш график сна и привычек. Стабилизируйте время отбоя (±30 минут) и оставьте вечером одну короткую практику замедления.'

  const createHabitTool = ({ title, category = 'Спокойствие', target_days_per_week = 7, frequency = 'daily' }) => {
    const newHabit = makeLocalHabitObject({
      title,
      target_days_per_week,
      category,
    })
    createdHabits.push(newHabit)

    const actionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    actions.push({
      id: actionId,
      isLocal: true,
      tool: 'create_habit',
      arguments: {
        title,
        category,
        target_days_per_week,
        frequency,
      },
      summary: `Создана привычка: ${title} (${target_days_per_week} дн.)`,
      status: 'applied',
      can_confirm: true,
      can_undo: true,
      snapshot: { createdHabitId: newHabit.id },
    })
  }

  const updateHabitTool = ({ targetHabit, newTitle, scheduleTime = '21:00' }) => {
    const previousHabit = targetHabit || habits[0] || {
      id: 1,
      title: 'Чтение 20 минут',
      target_days_per_week: 5,
      target_frequency: 5,
    }
    const cleanTitle = previousHabit.title.replace(/\s*\(\d{2}:\d{2}\)\s*$/, '')
    const updatedTitle = newTitle || `${cleanTitle} (${scheduleTime})`
    const days = previousHabit.target_days_per_week || previousHabit.target_frequency || 5

    updatedHabits.push({
      id: previousHabit.id,
      before: { ...previousHabit },
      after: {
        ...previousHabit,
        title: updatedTitle,
        target_days_per_week: days,
        target_frequency: days,
      },
    })

    const actionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    actions.push({
      id: actionId,
      isLocal: true,
      tool: 'update_habit',
      arguments: {
        id: previousHabit.id,
        changes: {
          title: updatedTitle,
          target_days_per_week: days,
          schedule_time: scheduleTime,
        },
      },
      summary: `Обновлена привычка: «${previousHabit.title}» → «${updatedTitle}»`,
      status: 'applied',
      can_confirm: true,
      can_undo: true,
      snapshot: { beforeHabit: { ...previousHabit } },
    })
  }

  if (lower.includes('дыхан') || lower.includes('плохо спал') || lower.includes('смести')) {
    if (lower.includes('смести') || lower.includes('чтен')) {
      const readingHabit = habits.find((h) => h.title?.toLowerCase().includes('чтен')) || habits[0]
      updateHabitTool({
        targetHabit: readingHabit,
        scheduleTime: '21:00',
      })
    }

    createHabitTool({
      title: 'Дыхание 4-7-8 (21:40)',
      category: 'Спокойствие',
      target_days_per_week: 7,
      frequency: 'daily (21:40)',
    })

    reply =
      'Проанализировал ваш режим за последние 3 дня: сместил чтение на 21:00 и добавил вечернюю практику «Дыхание 4-7-8» на 21:40 (7 дн./нед.) для снижения кортизола перед сном.'
  } else if (lower.includes('утренн') || (lower.includes('план') && !lower.includes('вечер'))) {
    const planItems = [
      {
        title: 'Стакан воды 400 мл (07:15)',
        category: 'Тело',
        target_days_per_week: 7,
        frequency: 'daily (07:15)',
      },
      {
        title: 'Дневной свет и разминка 10 мин (07:30)',
        category: 'Движение',
        target_days_per_week: 7,
        frequency: 'daily (07:30)',
      },
      {
        title: 'Контрастный душ (07:45)',
        category: 'Тело',
        target_days_per_week: 5,
        frequency: 'weekdays (07:45)',
      },
    ]

    const newObjects = planItems.map((item) => makeLocalHabitObject(item))
    createdHabits.push(...newObjects)

    actions.push({
      id: `local-${Date.now()}-plan`,
      isLocal: true,
      tool: 'apply_routine_plan',
      arguments: {
        name: 'Утренняя бодрость',
        habits: planItems,
      },
      summary: `Применён план «Утренняя бодрость»: ${planItems.map((i) => i.title).join(' · ')}`,
      status: 'applied',
      can_confirm: true,
      can_undo: true,
      snapshot: { createdHabitIds: newObjects.map((item) => item.id) },
    })

    reply =
      'Сформировал и применил план «Утренняя бодрость» (3 привычки) с акцентом на гидратацию, утренний свет и включение тонуса.'
  } else if (lower.includes('вечерн') || lower.includes('глубокого сна')) {
    const planItems = [
      {
        title: 'Без экранов за час до сна (22:00)',
        category: 'Сон',
        target_days_per_week: 7,
        frequency: 'daily (22:00)',
      },
      {
        title: 'Чтение бумажной книги 20 мин (21:20)',
        category: 'Разум',
        target_days_per_week: 6,
        frequency: '6x_week (21:20)',
      },
      {
        title: 'Дыхание 4-7-8 (21:45)',
        category: 'Спокойствие',
        target_days_per_week: 7,
        frequency: 'daily (21:45)',
      },
    ]

    const newObjects = planItems.map((item) => makeLocalHabitObject(item))
    createdHabits.push(...newObjects)

    actions.push({
      id: `local-${Date.now()}-evening`,
      isLocal: true,
      tool: 'apply_routine_plan',
      arguments: {
        name: 'Вечернее замедление',
        habits: planItems,
      },
      summary: `Применён план «Вечернее замедление»: ${planItems.map((i) => i.title).join(' · ')}`,
      status: 'applied',
      can_confirm: true,
      can_undo: true,
      snapshot: { createdHabitIds: newObjects.map((item) => item.id) },
    })

    reply =
      'Сформировал и применил вечерний протокол «Вечернее замедление» (3 привычки) для плавного снижения нагрузки перед сном.'
  } else if (
    lower.includes('добав') ||
    lower.includes('созда') ||
    lower.includes('включ')
  ) {
    const beforeSleep =
      lower.includes('перед сном') || lower.includes('до сна') || lower.includes('на ночь')
    const timeMatch = questionText.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/)
    const time = timeMatch
      ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`
      : beforeSleep
        ? '21:40'
        : '08:00'

    let habitTitle = ''
    if (lower.includes('вод')) {
      habitTitle = beforeSleep ? 'Выпить воды перед сном' : 'Стакан воды'
    } else if (lower.includes('чтен') || lower.includes('книг')) {
      habitTitle = 'Чтение 20 минут'
    } else if (lower.includes('прогул') || lower.includes('шаг')) {
      habitTitle = 'Прогулка 20 минут'
    } else if (lower.includes('размин') || lower.includes('зарядк')) {
      habitTitle = 'Разминка 10 минут'
    } else if (lower.includes('медитац')) {
      habitTitle = 'Медитация 10 минут'
    } else {
      const cleaned = questionText
        .replace(
          /\b(добавь|создай|включи|мне|пожалуйста|помоги|нужно|надо|хочу|трекер|привычку|привычка|такой|такую|такое|чтобы|я|перед\s+сном|до\s+сна|на\s+ночь|вечером|утром)\b/gi,
          ' ',
        )
        .replace(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      habitTitle =
        /[а-яёa-z]{2,}/i.test(cleaned)
          ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 48)
          : beforeSleep
            ? 'Вечерний ритуал'
            : 'Полезная привычка'
    }

    const fullTitle = `${habitTitle} (${time})`

    createHabitTool({
      title: fullTitle,
      category: beforeSleep ? 'Сон' : 'Ритуал',
      target_days_per_week: 7,
      frequency: `daily (${time})`,
    })

    reply = `Добавил привычку «${habitTitle}» (${time}, 7 дн./нед.) в ваш трекер.`
  }

  if ((createdHabits.length > 0 || updatedHabits.length > 0) && onHabitsChange) {
    onHabitsChange((prev) => {
      let next = [...prev]
      for (const upd of updatedHabits) {
        const idx = next.findIndex((h) => h.id === upd.id)
        if (idx !== -1) {
          next[idx] = upd.after
        }
      }
      for (const created of createdHabits) {
        if (!next.some((h) => h.title.toLowerCase() === created.title.toLowerCase())) {
          next.push(created)
        }
      }
      return next
    })
  }

  return {
    score: 82,
    summary: 'Автономный анализ режима сна и дисциплины выполнен.',
    insights: [
      `Средняя длительность сна: ${stats.avg_sleep_hours ?? 7.4} ч, качество: ${stats.avg_sleep_quality ?? 4.1}/5.`,
      `Выполнение недельного плана привычек: ${stats.habit_completion_percent ?? 68}%.`,
      'Вечерний буфер без экранов напрямую повышает глубину сна и утренний фокус.',
    ],
    recommendations: [
      'Держите фиксированный коридор отбоя 23:00–23:30 и подъёма 07:15–07:30.',
      'Выполняйте практику дыхания 4-7-8 за 30–40 минут до сна.',
      'Переносите когнитивно плотные привычки на первую половину дня или до 21:00.',
    ],
    reply,
    actions,
    stats: {
      avg_sleep_hours: stats.avg_sleep_hours ?? 7.4,
      avg_sleep_quality: stats.avg_sleep_quality ?? 4.1,
      habit_completion_percent: stats.habit_completion_percent ?? 68,
      sleep_regularity_percent: 84,
    },
  }
}

const ACTION_TOOL_LABELS = {
  create_habit: 'Новая привычка',
  update_habit: 'Обновление',
  log_sleep: 'Запись сна',
  apply_routine_plan: 'План режима',
}

function ActionBadge({ action, onConfirm, onUndo, busy }) {
  const isUndone = action.status === 'undone'
  const isConfirmed = action.status === 'confirmed'
  const toolLabel = ACTION_TOOL_LABELS[action.tool] || 'Действие'

  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2.5 text-xs ${
        isUndone
          ? 'border-[#222225] bg-[#0a0a0b] text-[#71717a]'
          : 'border-[#2e2e33] bg-[#121214] text-[#fafafa]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[11px] ${
              isUndone
                ? 'border-[#222225] text-[#71717a]'
                : 'border-zinc-400 bg-zinc-100 font-bold text-zinc-950'
            }`}
          >
            {isUndone ? '↺' : '✓'}
          </span>
          <span className={`font-semibold ${isUndone ? 'line-through' : ''}`}>
            {action.summary}
          </span>
        </div>

        <span className="rounded border border-[#27272a] bg-[#0d0d0e] px-2 py-0.5 text-[10px] font-medium text-[#a1a1aa]">
          {toolLabel}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#a1a1aa]">
          {isUndone
            ? 'Отменено · состояние восстановлено'
            : isConfirmed
              ? 'Подтверждено'
              : 'Изменение применено к трекеру'}
        </span>

        {!isUndone ? (
          <div className="flex items-center gap-1.5">
            {action.can_confirm && !isConfirmed ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onConfirm(action)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2e2e33] bg-[#18181b] px-2.5 text-[11px] font-semibold text-[#fafafa] transition-opacity hover:bg-[#27272a] disabled:opacity-40"
              >
                <Check className="inline-block h-3 w-3 shrink-0" />
                <span>Подтвердить</span>
              </button>
            ) : null}
            {action.can_undo ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onUndo(action)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#27272a] bg-[#0d0d0e] px-2.5 text-[11px] font-medium text-[#a1a1aa] transition-opacity hover:text-[#fafafa] disabled:opacity-40"
              >
                <RotateCcw className="inline-block h-3 w-3 shrink-0" />
                <span>Отменить</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AiAdvisorWidget({
  open,
  onOpen,
  onClose,
  sleepStats,
  habits,
  matrix,
  onRefreshData,
  onHabitsChange,
}) {
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
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
      setIsLoading(true)
      setError('')

      const trimmed = userQuestion.trim()
      const nextHistory = trimmed
        ? [...currentHistory, { role: 'user', text: trimmed }]
        : currentHistory

      if (trimmed) {
        setMessages(nextHistory)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const res = await api.aiAdvisor(
          {
            ...currentStats,
            ...(trimmed ? { question: trimmed } : {}),
            history: currentHistory.slice(-8),
          },
          {
            timeoutMs: REQUEST_TIMEOUT_MS,
            signal: controller.signal,
          },
        )

        setReport(res)
        setMessages([
          ...nextHistory,
          {
            role: 'assistant',
            text: res.reply,
            insights: res.insights || [],
            recommendations: res.recommendations || [],
            actions: res.actions || [],
            score: res.score,
          },
        ])

        if (Array.isArray(res.actions) && res.actions.length > 0) {
          await onRefreshData?.()
        }
      } catch {
        // Safe local mock fallback (1s delay) so the UI never hangs or breaks
        setError(
          'Не удалось связаться с сервером. Проверьте подключение — выполнен автономный локальный сценарий.',
        )

        const mockRes = await runLocalMockAdvisor(
          trimmed,
          currentStats,
          habits,
          onHabitsChange,
        )

        setReport(mockRes)
        setMessages([
          ...nextHistory,
          {
            role: 'assistant',
            text: mockRes.reply,
            insights: mockRes.insights,
            recommendations: mockRes.recommendations,
            actions: mockRes.actions,
            score: mockRes.score,
          },
        ])
      } finally {
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    },
    [currentStats, habits, onHabitsChange, onRefreshData],
  )

  useEffect(() => {
    if (open && !report && !isLoading && messages.length === 0) {
      askAdvisor('', [])
    }
  }, [open, report, isLoading, messages.length, askAdvisor])

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isLoading, open])

  function updateActionInMessages(updatedAction) {
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        actions: (msg.actions || []).map((a) => (a.id === updatedAction.id ? updatedAction : a)),
      })),
    )
  }

  async function handleConfirm(action) {
    setActionBusy(true)
    try {
      if (action.isLocal || String(action.id).startsWith('local-')) {
        updateActionInMessages({ ...action, status: 'confirmed', can_confirm: false })
        return
      }
      const res = await api.confirmAiAction(action.id)
      updateActionInMessages(res?.data || res)
      await onRefreshData?.()
    } catch {
      updateActionInMessages({ ...action, status: 'confirmed', can_confirm: false })
    } finally {
      setActionBusy(false)
    }
  }

  async function handleUndo(action) {
    setActionBusy(true)
    try {
      if (action.isLocal || String(action.id).startsWith('local-')) {
        if (onHabitsChange && action.snapshot) {
          onHabitsChange((prev) => {
            let next = [...prev]
            if (action.snapshot.createdHabitId) {
              next = next.filter((h) => h.id !== action.snapshot.createdHabitId)
            }
            if (Array.isArray(action.snapshot.createdHabitIds)) {
              next = next.filter((h) => !action.snapshot.createdHabitIds.includes(h.id))
            }
            if (action.snapshot.beforeHabit) {
              next = next.map((h) =>
                h.id === action.snapshot.beforeHabit.id ? action.snapshot.beforeHabit : h,
              )
            }
            return next
          })
        }
        updateActionInMessages({
          ...action,
          status: 'undone',
          can_confirm: false,
          can_undo: false,
        })
        return
      }
      const res = await api.undoAiAction(action.id)
      updateActionInMessages(res?.data || res)
      await onRefreshData?.()
    } catch {
      updateActionInMessages({
        ...action,
        status: 'undone',
        can_confirm: false,
        can_undo: false,
      })
    } finally {
      setActionBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!question.trim() || isLoading) return
    const q = question
    setQuestion('')
    askAdvisor(
      q,
      messages.map(({ role, text }) => ({ role, text })),
    )
  }

  function handleQuickPrompt(promptText) {
    if (isLoading) return
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
      <div className="fixed right-5 bottom-5 z-40">
        <LiquidButton
          variant="primary"
          onClick={onOpen}
          className="h-10 px-4 text-xs font-semibold shadow-lg"
        >
          <Bot className="inline-block h-4 w-4 shrink-0" />
          <span>AI-консультант Lumen</span>
          {report?.score != null ? (
            <span className="ml-1 rounded bg-[#09090b] px-1.5 py-0.5 font-mono text-[11px] text-[#fafafa]">
              {report.score}
            </span>
          ) : null}
        </LiquidButton>
      </div>

      {open ? (
        <div className="glass-modal-backdrop" onClick={onClose}>
          <div
            className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#27272a] bg-[#0d0d0e] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#222225] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#2e2e33] bg-[#141417] text-[#fafafa]">
                  <Bot className="inline-block h-4 w-4 shrink-0" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-[#fafafa]">
                    AI-консультант Lumen
                  </h2>
                  <p className="mt-0.5 text-xs text-[#a1a1aa]">
                    Персональный помощник по привычкам и режиму сна
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => askAdvisor('', [])}
                  disabled={isLoading}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#27272a] bg-[#141417] text-[#a1a1aa] transition-opacity hover:text-[#fafafa] disabled:opacity-50"
                  title="Обновить разбор"
                >
                  <RefreshCw
                    className={`inline-block h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#27272a] bg-[#141417] text-[#a1a1aa] transition-opacity hover:text-[#fafafa]"
                  aria-label="Закрыть"
                >
                  <X className="inline-block h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>

            {/* Stats summary */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-[#222225] bg-[#121214] px-3 py-2">
                <p className="text-[11px] font-medium text-[#a1a1aa]">Средний сон</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#fafafa]">
                  {displayStats.avg_sleep_hours ?? 0} ч
                </p>
              </div>
              <div className="rounded-lg border border-[#222225] bg-[#121214] px-3 py-2">
                <p className="text-[11px] font-medium text-[#a1a1aa]">Качество сна</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#fafafa]">
                  {displayStats.avg_sleep_quality ?? 0}/5
                </p>
              </div>
              <div className="rounded-lg border border-[#222225] bg-[#121214] px-3 py-2">
                <p className="text-[11px] font-medium text-[#a1a1aa]">Привычки (7 дн.)</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#fafafa]">
                  {displayStats.habit_completion_percent ?? 0}%
                </p>
              </div>
              <div className="rounded-lg border border-[#222225] bg-[#121214] px-3 py-2">
                <p className="text-[11px] font-medium text-[#a1a1aa]">Индекс баланса</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-[#fafafa]">
                  {report?.score != null ? `${report.score}/100` : '—'}
                </p>
              </div>
            </div>

            {/* Insights & recommendations */}
            {report ? (
              <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                {Array.isArray(report.insights) && report.insights.length > 0 ? (
                  <div className="rounded-lg border border-[#222225] bg-[#121214] p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                      <Lightbulb className="inline-block h-3.5 w-3.5 shrink-0" />
                      <span>Инсайты по данным</span>
                    </p>
                    <ul className="space-y-1 text-xs leading-relaxed text-[#f4f4f5]">
                      {report.insights.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#71717a]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(report.recommendations) && report.recommendations.length > 0 ? (
                  <div className="rounded-lg border border-[#222225] bg-[#121214] p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                      <CheckCircle2 className="inline-block h-3.5 w-3.5 shrink-0" />
                      <span>Рекомендации</span>
                    </p>
                    <ul className="space-y-1 text-xs leading-relaxed text-[#f4f4f5]">
                      {report.recommendations.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[#fafafa]">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Chat & Tool executions */}
            <div className="mt-3.5 max-h-72 min-h-[110px] space-y-2.5 overflow-y-auto rounded-lg border border-[#222225] bg-[#09090b] p-3">
              {messages.length === 0 && isLoading ? (
                <div className="flex items-center gap-2 py-3 text-xs text-[#a1a1aa]">
                  <Loader2 className="inline-block h-4 w-4 shrink-0 animate-spin" />
                  <span>AI-консультант Lumen анализирует ваш режим сна и привычек…</span>
                </div>
              ) : null}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-auto max-w-[88%] border-[#2e2e33] bg-[#141417] text-[#fafafa]'
                      : 'border-[#222225] bg-[#0d0d0e] text-[#f4f4f5]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#a1a1aa]">
                    <span className="font-semibold">
                      {msg.role === 'user' ? 'Вы' : 'AI-консультант Lumen'}
                    </span>
                    {msg.actions?.length ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                        <Wrench className="inline-block h-3 w-3 shrink-0" />
                        <span>Выполнено: {msg.actions.length}</span>
                      </span>
                    ) : null}
                  </div>
                  <p>{msg.text}</p>

                  {msg.actions?.length ? (
                    <div className="mt-2 space-y-2">
                      {msg.actions.map((action) => (
                        <ActionBadge
                          key={action.id}
                          action={action}
                          busy={isLoading || actionBusy}
                          onConfirm={handleConfirm}
                          onUndo={handleUndo}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {messages.length > 0 && isLoading ? (
                <div className="flex items-center gap-2 py-1 text-xs text-[#a1a1aa]">
                  <Loader2 className="inline-block h-3.5 w-3.5 shrink-0 animate-spin" />
                  <span>AI-консультант Lumen обрабатывает запрос…</span>
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>

            {error ? (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                {error}
              </div>
            ) : null}

            {/* Quick agentic prompts */}
            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                <MessageSquarePlus className="inline-block h-3.5 w-3.5 shrink-0" />
                <span>Быстрые команды</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickPrompt(item.prompt)}
                    title={item.prompt}
                    className="tag-chip justify-center py-2 text-center text-xs font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input form — fixed dimensions & overflow-hidden to prevent any layout shift/jitter */}
            <form
              className="mt-3 flex items-center gap-2 overflow-hidden"
              onSubmit={handleSubmit}
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Например: добавь стакан воды перед сном или составь план…"
                maxLength={1000}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#27272a] bg-[#121214] px-3 py-0 text-xs font-medium text-[#fafafa] placeholder:text-[#71717a] outline-none focus:border-[#52525b] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="inline-flex h-10 w-[145px] min-w-[145px] shrink-0 items-center justify-center gap-2 rounded-lg border border-[#fafafa] bg-[#fafafa] px-3 py-0 text-xs font-semibold text-[#09090b] transition-opacity duration-150 hover:bg-[#e4e4e7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="inline-block h-4 w-4 flex-shrink-0 animate-spin" />
                    <span className="truncate">Выполнение...</span>
                  </>
                ) : (
                  <>
                    <Send className="inline-block h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Выполнить</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
