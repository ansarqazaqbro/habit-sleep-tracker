function cellColor(value) {
  if (value == null) return '#09090b'
  if (value <= 0) return '#121214'
  if (value < 0.35) return '#27272a'
  if (value < 0.65) return '#52525b'
  if (value < 0.9) return '#a1a1aa'
  return '#ededed'
}

export function ActivityMatrix({ matrix }) {
  const days = matrix?.days || []
  const columns = []
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7))
  }

  return (
    <div className="rounded-[10px] border border-[#222225] bg-[#0d0d0e] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[#ededed]">
            Матрица дисциплины (16 недель)
          </h3>
          <p className="text-xs text-[#71717a]">
            Доля выполненных привычек за каждый день
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
          <span>меньше</span>
          {[0, 0.25, 0.5, 0.75, 1].map((value) => (
            <span
              key={value}
              className="heatmap-cell inline-block"
              style={{ backgroundColor: cellColor(value) }}
            />
          ))}
          <span>больше</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {columns.map((week, index) => (
          <div key={index} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${Math.round((day.value || 0) * 100)}%`}
                className="heatmap-cell"
                style={{ backgroundColor: cellColor(day.value) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
