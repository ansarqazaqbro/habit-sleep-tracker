import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LiquidCard } from '../liquid/LiquidCard'

function LiquidTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const hours = Math.floor(point.minutes / 60)
  const minutes = point.minutes % 60

  return (
    <div className="liquid-glass-card liquid-glass-card--optic px-3 py-2 text-sm">
      <div className="liquid-glass-card__chroma" />
      <div className="liquid-glass-card__content">
        <div className="text-[var(--muted)]">
          {label} · {point.date}
        </div>
        <div className="font-semibold">
          {point.minutes ? `${hours} ч ${minutes} мин` : 'нет записи'}
        </div>
        {point.minutes ? <div>цель {point.goal_percent}%</div> : null}
        {point.quality ? <div>качество {point.quality}/5</div> : null}
      </div>
    </div>
  )
}

export function SleepChart({ chart }) {
  return (
    <LiquidCard hoverScale={false} className="p-5">
      <h3 className="mb-4 text-lg font-semibold">Динамика сна · 7 дней</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sleepStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'currentColor', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'currentColor', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 10]}
              unit="ч"
            />
            <Tooltip
              content={<LiquidTooltip />}
              cursor={{ stroke: 'var(--accent)', strokeOpacity: 0.35 }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="url(#sleepStroke)"
              fill="url(#sleepFill)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </LiquidCard>
  )
}
