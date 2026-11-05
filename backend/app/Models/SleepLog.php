<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable([
    'user_id',
    'bed_time',
    'wake_time',
    'duration_minutes',
    'quality_rating',
    'notes',
    'date',
])]
class SleepLog extends Model
{
    public const GOAL_MINUTES = 480;

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'quality_rating' => 'integer',
            'duration_minutes' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function minutesBetween(string $bedTime, string $wakeTime): int
    {
        $bed = Carbon::parse($bedTime);
        $wake = Carbon::parse($wakeTime);

        if ($wake->lessThanOrEqualTo($bed)) {
            $wake->addDay();
        }

        return (int) max(0, $bed->diffInMinutes($wake, true));
    }

    public function goalPercent(): float
    {
        return round(min(1, $this->duration_minutes / self::GOAL_MINUTES) * 100, 1);
    }
}
