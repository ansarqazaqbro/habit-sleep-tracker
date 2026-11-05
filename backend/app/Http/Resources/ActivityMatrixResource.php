<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps the array produced by ActivityMatrixService::build().
 *
 * @property array<string, mixed> $resource
 */
class ActivityMatrixResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $matrix = $this->resource;

        return [
            'start' => $matrix['start'],
            'end' => $matrix['end'],
            'weeks' => $matrix['weeks'],
            'habit_count' => $matrix['habit_count'],
            'days' => collect($matrix['days'])->map(fn (array $day) => [
                'date' => $day['date'],
                'weekday' => $day['weekday'],
                'value' => $day['value'] === null ? null : (float) $day['value'], // 0.0 – 1.0
                'completed' => $day['completed'],
                'total' => $day['total'],
            ])->all(),
        ];
    }
}
