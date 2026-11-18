<?php

namespace App\Services;

use App\Models\Habit;
use App\Models\HabitLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StreakService
{
    /**
     * Mark/unmark a habit as completed on a given day and recalculate its streaks.
     *
     * @return bool true when the habit is completed on $date after the call
     */
    public function toggle(Habit $habit, ?string $date = null): bool
    {
        $date = $date ?: now()->toDateString();

        return DB::transaction(function () use ($habit, $date): bool {
            $existing = $habit->logs()
                ->whereDate('completed_at', $date)
                ->first();

            if ($existing) {
                $existing->delete();
                $completed = false;
            } else {
                $habit->logs()->create([
                    'user_id' => $habit->user_id,
                    'completed_at' => $date,
                    'status' => HabitLog::STATUS_COMPLETED,
                ]);
                $completed = true;
            }

            $this->recalculate($habit);

            return $completed;
        });
    }

    /**
     * Transactionally recalculate `streak_count` (current run of consecutive days,
     * still alive if the last completion was today or yesterday) and `best_streak`
     * (longest run ever) from the completed HabitLog rows.
     */
    public function recalculate(Habit $habit): Habit
    {
        return DB::transaction(function () use ($habit): Habit {
            $dates = $this->completedDates($habit);
            $current = $this->currentStreak($dates);

            $habit->forceFill([
                'streak_count' => $current,
                // A personal record never decreases when a day is un-toggled.
                'best_streak' => max((int) $habit->best_streak, $this->longestStreak($dates), $current),
            ])->save();

            return $habit;
        });
    }

    /**
     * @return Collection<int, string> unique, sorted Y-m-d strings
     */
    private function completedDates(Habit $habit): Collection
    {
        return $habit->logs()
            ->where('status', HabitLog::STATUS_COMPLETED)
            ->orderBy('completed_at')
            ->pluck('completed_at')
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->unique()
            ->values();
    }

    /**
     * Вычисляет максимальную серию подряд идущих дней из отсортированных дат.
     *
     * @param  Collection<int, string>  $dates
     */
    private function longestStreak(Collection $dates): int
    {
        $best = 0;
        $run = 0;
        $previous = null;

        foreach ($dates as $date) {
            $current = Carbon::parse($date)->startOfDay();

            $run = $previous && $previous->copy()->addDay()->isSameDay($current)
                ? $run + 1
                : 1;

            $best = max($best, $run);
            $previous = $current;
        }

        return $best;
    }

    private function currentStreak(Collection $dates): int
    {
        $lookup = $dates->flip();
        $cursor = Carbon::today();

        // A streak is still alive if today is not completed yet but yesterday was.
        if (! $lookup->has($cursor->toDateString())) {
            $cursor->subDay();
        }

        $streak = 0;

        while ($lookup->has($cursor->toDateString())) {
            $streak++;
            $cursor->subDay();
        }

        return $streak;
    }
}
