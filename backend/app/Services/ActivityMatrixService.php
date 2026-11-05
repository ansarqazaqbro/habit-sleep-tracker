<?php

namespace App\Services;

use App\Models\HabitLog;
use App\Models\User;
use Illuminate\Support\Carbon;

class ActivityMatrixService
{
    /**
     * Build a Monday-aligned calendar matrix. Each day carries a completion
     * ratio in [0.0, 1.0] (completed habits / total habits); future days have `value = null`.
     *
     * @return array<string, mixed>
     */
    public function build(User $user, int $weeks = 16): array
    {
        $weeks = max(4, min(26, $weeks));
        $habitCount = $user->habits()->count();
        $divisor = max(1, $habitCount);

        $today = Carbon::today();
        $start = $today->copy()->subWeeks($weeks - 1)->startOfWeek(Carbon::MONDAY);
        $end = $today->copy()->endOfWeek(Carbon::SUNDAY)->startOfDay();

        $completedByDay = HabitLog::query()
            ->where('user_id', $user->id)
            ->where('status', HabitLog::STATUS_COMPLETED)
            ->whereDate('completed_at', '>=', $start->toDateString())
            ->selectRaw('completed_at, count(distinct habit_id) as done')
            ->groupBy('completed_at')
            ->pluck('done', 'completed_at')
            ->mapWithKeys(fn ($done, $date) => [Carbon::parse($date)->toDateString() => (int) $done]);

        $days = [];

        for ($cursor = $start->copy(); $cursor->lte($end); $cursor->addDay()) {
            $isFuture = $cursor->gt($today);
            $done = $isFuture ? 0 : (int) ($completedByDay[$cursor->toDateString()] ?? 0);

            $days[] = [
                'date' => $cursor->toDateString(),
                'weekday' => $cursor->dayOfWeekIso,
                'value' => $isFuture ? null : round(min(1, $done / $divisor), 2),
                'completed' => $done,
                'total' => $habitCount,
            ];
        }

        return [
            'start' => $start->toDateString(),
            'end' => $today->toDateString(),
            'weeks' => $weeks,
            'habit_count' => $habitCount,
            'days' => $days,
        ];
    }
}
