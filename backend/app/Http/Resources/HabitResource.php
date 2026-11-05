<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Habit */
class HabitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'target_frequency' => $this->target_frequency,
            'streak_count' => $this->streak_count,
            'best_streak' => $this->best_streak,
            'accent' => $this->accent,
            'icon' => $this->icon,
            // `completed_today` is preloaded via withExists() on lists; computed lazily otherwise.
            'completed_today' => (bool) ($this->completed_today ?? $this->isCompletedOn()),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
