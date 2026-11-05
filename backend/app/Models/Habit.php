<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'title',
    'target_frequency',
    'streak_count',
    'best_streak',
    'accent',
    'icon',
])]
class Habit extends Model
{
    protected function casts(): array
    {
        return [
            'target_frequency' => 'integer',
            'streak_count' => 'integer',
            'best_streak' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    public function isCompletedOn(?string $date = null): bool
    {
        $date ??= now()->toDateString();

        return $this->logs()
            ->whereDate('completed_at', $date)
            ->where('status', HabitLog::STATUS_COMPLETED)
            ->exists();
    }
}
