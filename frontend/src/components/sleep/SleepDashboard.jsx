import { AiAdviceCard } from './AiAdviceCard'
import { SleepChart } from './SleepChart'
import { SleepQualityWidget } from './SleepQualityWidget'
import { SleepQuickForm } from './SleepQuickForm'
import { api } from '../../lib/api'
import { playSleepChime } from '../../lib/sound'

export function SleepDashboard({ stats, onRefresh, onOpenAdvisor }) {
  const chart = stats?.chart || []

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-[var(--muted)]">Ночной ритм</p>
        <h1 className="text-3xl font-semibold tracking-tight">Трекер сна</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <SleepQuickForm
          onSave={async (payload) => {
            const saved = await api.saveSleep(payload)
            if (saved.goal_percent >= 100) playSleepChime()
            await onRefresh()
          }}
        />
        <SleepChart chart={chart} />
      </div>

      <SleepQualityWidget stats={stats || {}} />
      <AiAdviceCard refreshKey={stats?.nights_logged} onOpenAdvisor={onOpenAdvisor} />
    </div>
  )
}
