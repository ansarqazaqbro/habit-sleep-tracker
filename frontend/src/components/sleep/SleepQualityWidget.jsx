export function SleepQualityWidget({ stats }) {
  const cards = [
    { label: 'Средняя длительность', value: `${stats.average_hours || 0} ч` },
    { label: 'От цели 8 ч', value: `${stats.goal_percent || 0}%` },
    { label: 'Регулярность', value: `${stats.regularity || 0}%` },
    { label: 'Качество', value: `${stats.average_quality || 0}/5` },
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4"
          >
            <p className="text-xs text-[#71717a]">{card.label}</p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-[#ededed]">
              {card.value}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
          Рекомендация недели
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#ededed]">{stats.recommendation}</p>
      </div>
    </div>
  )
}
