<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['title', 'icon', 'color'])]
class Category extends Model
{
    public function habits(): BelongsToMany
    {
        return $this->belongsToMany(Habit::class);
    }
}
