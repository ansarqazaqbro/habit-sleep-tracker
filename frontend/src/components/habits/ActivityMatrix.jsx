import { LiquidCard } from '../liquid/LiquidCard'

function cellColor(value) {
  if (value == null) return 'transparent'
  if (value <= 0) return 'rgba(255,255,255,0.06)'
  if (value < 0.25) return 'rgba(16, 68, 52, 0.55)'
  if (value < 0.5) return 'rgba(6, 120, 80, 0.75)'
  if (value < 0.75) return 'rgba(16, 185, 129, 0.88)'
  return 'rgba(52, 255, 176, 0.95)'
}

function glow(value) {
  if (value >= 1) return '0 0 10px rgba(52, 255, 176, 0.55)'
  if (value >= 0.75) return '0 0 8px rgba(16, 185, 129, 0.35)'
  return 'none'
}

export function ActivityMatrix({ matrix }) {
  const days = matrix?.days || []
  const columns = []
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7))
  }

  return (
    <LiquidCard hoverScale={false} className="p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Матрица активности</h3>
          <p className="text-sm text-[var(--muted)]">Яркость — доля выполненных привычек за день</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
          меньше
          {[0, 0.25, 0.5, 0.75, 1].map((value) => (
            <span
              key={value}
              className="heatmap-cell"
              style={{ background: cellColor(value), boxShadow: glow(value) }}
            />
          ))}
          больше
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {columns.map((week, index) => (
          <div key={index} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${Math.round((day.value || 0) * 100)}%`}
                className="heatmap-cell"
                style={{
                  background: cellColor(day.value),
                  boxShadow: glow(day.value || 0),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </LiquidCard>
  )
}
