import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function MonochromeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const hours = Math.floor((point.minutes || 0) / 60)
  const minutes = (point.minutes || 0) % 60

  return (
    <div className="rounded-lg border border-[#222225] bg-[#121214] px-3 py-2 text-xs text-[#ededed]">
      <div className="text-[#71717a]">
        {label} · {point.date}
      </div>
      <div className="mt-0.5 font-mono font-semibold">
        {point.minutes ? `${hours} ч ${minutes} мин` : 'нет записи'}
      </div>
      {point.minutes ? <div className="text-[#71717a]">Норма: {point.goal_percent}%</div> : null}
      {point.quality ? <div className="text-[#71717a]">Качество: {point.quality}/5</div> : null}
    </div>
  )
}

export function SleepChart({ chart }) {
  return (
    <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[#ededed]">
            Динамика сна · 7 дней
          </h3>
          <p className="text-xs text-[#71717a]">Продолжительность сна по суткам (ориентир 8 ч)</p>
        </div>
        <span className="font-mono text-xs text-[#71717a]">ч / сутки</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="monoSleepFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e4e4e7" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#e4e4e7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#18181b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#71717a', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 10]}
              unit="ч"
            />
            <Tooltip
              content={<MonochromeTooltip />}
              cursor={{ stroke: '#52525b', strokeDasharray: '3 3' }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#ededed"
              fill="url(#monoSleepFill)"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ededed', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#ffffff', stroke: '#09090b', strokeWidth: 2 }}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
