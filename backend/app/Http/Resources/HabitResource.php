<?php

namespace App\Http\Resources;

use App\Models\HabitLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/** @mixin \App\Models\Habit */
class HabitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $target = max(1, min(7, (int) ($this->target_frequency ?: 7)));
        $week = $this->computeWeekProgress($target);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'target_frequency' => $target,
            'target_days_per_week' => $target,
            'streak_count' => (int) $this->streak_count,
            'streak' => (int) $this->streak_count,
            'best_streak' => (int) $this->best_streak,
            'accent' => '#e4e4e7',
            'color' => '#e4e4e7',
            'is_active' => true,
            'icon' => $this->icon,
            'completed_today' => (bool) ($this->completed_today ?? $this->isCompletedOn()),
            'completed_this_week' => $week['completed'],
            'week' => $week,
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{completed: int, target: int, days: list<array{date: string, done: bool, future: bool}>}
     */
    private function computeWeekProgress(int $target): array
    {
        $today = Carbon::today();
        $monday = $today->copy()->startOfWeek(Carbon::MONDAY);
        $sunday = $today->copy()->endOfWeek(Carbon::SUNDAY);

        $completedDates = $this->logs()
            ->where('status', HabitLog::STATUS_COMPLETED)
            ->whereDate('completed_at', '>=', $monday->toDateString())
            ->whereDate('completed_at', '<=', $sunday->toDateString())
            ->pluck('completed_at')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->unique()
            ->flip();

        $days = [];
        $completedCount = 0;

        for ($i = 0; $i < 7; $i++) {
            $day = $monday->copy()->addDays($i);
            $dateStr = $day->toDateString();
            $done = $completedDates->has($dateStr);
            if ($done) {
                $completedCount++;
            }
            $days[] = [
                'date' => $dateStr,
                'done' => $done,
                'future' => $day->gt($today),
            ];
        }

        return [
            'completed' => $completedCount,
            'target' => $target,
            'days' => $days,
        ];
    }
}
