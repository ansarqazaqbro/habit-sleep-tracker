<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Habit;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class HabitService
{
    public function __construct(
        private readonly StreakService $streaks,
    ) {}

    /**
     * @return Collection<int, Habit>
     */
    public function listFor(User $user): Collection
    {
        $today = now()->toDateString();

        return $user->habits()
            ->with('categories')
            ->withExists([
                'logs as completed_today' => fn ($query) => $query
                    ->whereDate('completed_at', $today)
                    ->where('status', 'completed'),
            ])
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): Habit
    {
        $categoryIds = $data['category_ids'] ?? [];
        unset($data['category_ids']);

        if (isset($data['target_days_per_week']) && ! isset($data['target_frequency'])) {
            $data['target_frequency'] = (int) $data['target_days_per_week'];
        }
        unset($data['target_days_per_week']);

        $data['accent'] = $data['accent'] ?? '#e4e4e7';

        return DB::transaction(function () use ($user, $data, $categoryIds) {
            /** @var Habit $habit */
            $habit = $user->habits()->create($data);
            if ($categoryIds !== []) {
                $habit->categories()->sync($categoryIds);
            }

            return $habit->refresh()->load('categories');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Habit $habit, array $data): Habit
    {
        $categoryIds = $data['category_ids'] ?? null;
        unset($data['category_ids']);

        if (isset($data['target_days_per_week']) && ! isset($data['target_frequency'])) {
            $data['target_frequency'] = (int) $data['target_days_per_week'];
        }
        unset($data['target_days_per_week']);

        return DB::transaction(function () use ($habit, $data, $categoryIds) {
            $habit->update($data);
            if ($categoryIds !== null) {
                $habit->categories()->sync($categoryIds);
            }

            return $habit->refresh()->load('categories');
        });
    }

    public function toggle(Habit $habit, ?string $date = null): Habit
    {
        $this->streaks->toggle($habit, $date);

        return $habit->refresh()->load('categories');
    }

    /**
     * Resolves a category name or slug to existing Category IDs.
     *
     * @return list<int>
     */
    public function resolveCategoryIds(?string $categoryHint): array
    {
        if (! $categoryHint || trim($categoryHint) === '') {
            return [];
        }

        $needle = mb_strtolower(trim($categoryHint));
        $map = [
            'sleep' => ['сон', 'вечер', 'отдых'],
            'calm' => ['спокойств', 'дыхан', 'медитац', 'стресс', 'баланс'],
            'mind' => ['разум', 'чтен', 'книг', 'учеб', 'фокус', 'когнит'],
            'body' => ['тело', 'здоров', 'вод', 'душ', 'питан', 'утр'],
            'move' => ['движен', 'спорт', 'прогул', 'шаг', 'размин', 'тренир'],
        ];

        $categories = Category::query()->get();
        foreach ($categories as $cat) {
            $titleLower = mb_strtolower($cat->title);
            if ($titleLower === $needle || str_contains($titleLower, $needle)) {
                return [$cat->id];
            }

            foreach ($map as $key => $keywords) {
                if ($needle === $key) {
                    foreach ($keywords as $kw) {
                        if (str_contains($titleLower, $kw)) {
                            return [$cat->id];
                        }
                    }
                }
            }
        }

        return $categories->first() ? [$categories->first()->id] : [];
    }
}
