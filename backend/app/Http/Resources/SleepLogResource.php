<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SleepLog */
class SleepLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $minutes = (int) $this->duration_minutes;
        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;

        return [
            'id' => $this->id,
            'date' => $this->date->toDateString(),
            'bed_time' => substr((string) $this->bed_time, 0, 5),
            'wake_time' => substr((string) $this->wake_time, 0, 5),
            'duration_minutes' => $minutes,
            'duration_hours' => round($minutes / 60, 2),
            'duration' => [
                'hours' => $hours,
                'minutes' => $rest,
                'label' => "{$hours} ч {$rest} мин",
            ],
            'quality_rating' => $this->quality_rating,
            'notes' => $this->notes,
            'goal_percent' => $this->goalPercent(),
        ];
    }
}
