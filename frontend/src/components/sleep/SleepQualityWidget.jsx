import { LiquidCard } from '../liquid/LiquidCard'

export function SleepQualityWidget({ stats }) {
  const cards = [
    { label: 'Средняя длительность', value: `${stats.average_hours || 0} ч` },
    { label: 'От цели 8 ч', value: `${stats.goal_percent || 0}%` },
    { label: 'Регулярность', value: `${stats.regularity || 0}` },
    { label: 'Качество', value: `${stats.average_quality || 0}/5` },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <LiquidCard key={card.label} className="p-5">
          <p className="text-sm text-[var(--muted)]">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
        </LiquidCard>
      ))}
      <LiquidCard hoverScale={false} className="p-5 md:col-span-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">Рекомендация недели</p>
        <p className="mt-2 text-base leading-relaxed">{stats.recommendation}</p>
      </LiquidCard>
    </div>
  )
}
