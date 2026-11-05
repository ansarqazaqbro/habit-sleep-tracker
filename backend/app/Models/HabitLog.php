<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['habit_id', 'user_id', 'completed_at', 'status'])]
class HabitLog extends Model
{
    public const STATUS_COMPLETED = 'completed';

    protected function casts(): array
    {
        return [
            'completed_at' => 'date:Y-m-d',
        ];
    }

    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
