<?php

namespace App\Services;

use App\Models\SleepLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class SleepAnalyticsService
{
    /** A night counts as "regular" when bed time is within this window of the median. */
    private const REGULARITY_WINDOW_MINUTES = 30;

    private const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    /**
     * Summary for the last 7 days (today included): average sleep, regularity
     * percentage and a ready-to-plot data series for the frontend chart.
     *
     * @return array<string, mixed>
     */
    public function getWeeklySummary(int $userId): array
    {
        $goal = SleepLog::GOAL_MINUTES;
        $today = Carbon::today();
        $from = $today->copy()->subDays(6);

        /** @var Collection<int, SleepLog> $logs */
        $logs = SleepLog::query()
            ->where('user_id', $userId)
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $today->toDateString())
            ->orderBy('date')
            ->get();

        $byDate = $logs->keyBy(fn (SleepLog $log) => $log->date->toDateString());

        $chart = collect(range(6, 0))->map(function (int $offset) use ($today, $byDate) {
            $day = $today->copy()->subDays($offset);
            /** @var SleepLog|null $log */
            $log = $byDate->get($day->toDateString());

            return [
                'date' => $day->toDateString(),
                'label' => self::WEEKDAYS[$day->dayOfWeek],
                'hours' => $log ? round($log->duration_minutes / 60, 2) : 0,
                'minutes' => $log?->duration_minutes ?? 0,
                'quality' => $log?->quality_rating,
                'goal_percent' => $log ? $log->goalPercent() : 0,
            ];
        })->values()->all();

        $avgMinutes = $logs->isEmpty() ? 0.0 : (float) $logs->avg('duration_minutes');
        $avgQuality = $logs->isEmpty() ? 0.0 : (float) $logs->avg('quality_rating');
        $regularity = $this->regularityPercent($logs);

        return [
            'goal_minutes' => $goal,
            'goal_hours' => $goal / 60,
            'average_minutes' => (int) round($avgMinutes),
            'average_hours' => round($avgMinutes / 60, 2),
            'average_quality' => round($avgQuality, 1),
            'goal_percent' => $avgMinutes > 0 ? round(min(1, $avgMinutes / $goal) * 100, 1) : 0,
            'nights_logged' => $logs->count(),
            'regularity' => $regularity,
            'recommendation' => $this->recommendation($avgMinutes, $avgQuality, $regularity, $logs->count()),
            'chart' => $chart,
        ];
    }

    /**
     * Percentage (0-100) of logged nights whose bed time falls within ±30 minutes
     * of the week's median bed time. Times after midnight are shifted by +24h so
     * that 23:50 and 00:10 are treated as 20 minutes apart.
     *
     * @param  Collection<int, SleepLog>  $logs
     */
    private function regularityPercent(Collection $logs): int
    {
        if ($logs->isEmpty()) {
            return 0;
        }

        $bedMinutes = $logs
            ->map(fn (SleepLog $log) => $this->bedTimeMinutes((string) $log->bed_time))
            ->sort()
            ->values();

        $median = $bedMinutes->median();

        $regular = $bedMinutes
            ->filter(fn (int $minutes) => abs($minutes - $median) <= self::REGULARITY_WINDOW_MINUTES)
            ->count();

        return (int) round($regular / $bedMinutes->count() * 100);
    }

    /**
     * Преобразует время HH:MM в минуты от полудня; время до 12:00 сдвигается на +24 часа.
     */
    private function bedTimeMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));
        $total = $hours * 60 + $minutes;

        return $total < 12 * 60 ? $total + 24 * 60 : $total;
    }

    private function recommendation(float $avgMinutes, float $avgQuality, int $regularity, int $nights): string
    {
        if ($nights === 0) {
            return 'Запишите несколько ночей — тогда появятся персональные рекомендации по ритму сна.';
        }

        if ($avgMinutes < SleepLog::GOAL_MINUTES * 0.85) {
            return 'Сон короче цели. Сдвиньте отход ко сну на 30–40 минут раньше и держите одно и то же окно.';
        }

        if ($regularity < 55) {
            return 'Время засыпания гуляет. Стабильный bedtime важнее идеальных 8 часов — выровняйте график.';
        }

        if ($avgQuality < 3.5) {
            return 'Часы есть, качество ниже. Приглушите свет за час до сна и уберите экраны из постели.';
        }

        return 'Ритм ровный и близко к цели. Сохраняйте текущее окно сна.';
    }
}
