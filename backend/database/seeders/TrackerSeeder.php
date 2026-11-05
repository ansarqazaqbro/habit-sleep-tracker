<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\SleepLog;
use App\Models\User;
use App\Services\StreakService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class TrackerSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'demo@habit.local'],
            ['name' => 'Aurora', 'password' => Hash::make('password')],
        );

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@habit.local'],
            ['name' => 'Admin', 'password' => Hash::make('password')],
        );
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        $categories = collect([
            ['title' => 'Здоровье', 'icon' => 'heart-pulse', 'color' => '#67e8f9'],
            ['title' => 'Разум', 'icon' => 'brain', 'color' => '#c4b5fd'],
            ['title' => 'Спорт', 'icon' => 'dumbbell', 'color' => '#6ee7b7'],
            ['title' => 'Сон', 'icon' => 'moon-star', 'color' => '#93c5fd'],
            ['title' => 'Спокойствие', 'icon' => 'wind', 'color' => '#fda4af'],
        ])->mapWithKeys(fn (array $item) => [
            $item['title'] => Category::query()->firstOrCreate(['title' => $item['title']], $item),
        ]);

        $catalog = [
            ['title' => 'Выпить воду', 'accent' => '#67e8f9', 'icon' => 'droplets', 'categories' => ['Здоровье']],
            ['title' => 'Чтение 20 мин', 'accent' => '#c4b5fd', 'icon' => 'book-open', 'categories' => ['Разум']],
            ['title' => 'Прогулка', 'accent' => '#6ee7b7', 'icon' => 'footprints', 'categories' => ['Спорт', 'Здоровье']],
            ['title' => 'Не есть после 23:00', 'accent' => '#93c5fd', 'icon' => 'moon-star', 'categories' => ['Сон']],
            ['title' => 'Дыхание 4-7-8', 'accent' => '#fda4af', 'icon' => 'wind', 'categories' => ['Спокойствие', 'Сон']],
        ];

        $habits = collect($catalog)->map(function (array $item) use ($user, $categories) {
            $habit = $user->habits()->firstOrCreate(
                ['title' => $item['title']],
                [
                    'accent' => $item['accent'],
                    'icon' => $item['icon'],
                    'target_frequency' => 7,
                ],
            );

            $habit->categories()->syncWithoutDetaching(
                collect($item['categories'])->map(fn (string $title) => $categories[$title]->id)->all(),
            );

            return $habit;
        });

        $start = Carbon::today()->subDays(45);

        for ($day = $start->copy(); $day->lte(Carbon::today()); $day->addDay()) {
            $habits->each(function (Habit $habit) use ($day, $user) {
                $seed = abs(crc32($habit->id.$day->toDateString()));
                $chance = 0.42 + (($seed % 40) / 100);

                if ($day->isSunday()) {
                    $chance -= 0.12;
                }

                if ($chance < 0.55) {
                    return;
                }

                $habit->logs()->firstOrCreate(
                    ['completed_at' => $day->toDateString()],
                    ['user_id' => $user->id, 'status' => HabitLog::STATUS_COMPLETED],
                );
            });

            $bedHour = 23 - (abs(crc32('bed'.$day->toDateString())) % 2);
            $bedMin = [10, 20, 35, 50][abs(crc32('bmin'.$day->toDateString())) % 4];
            $wakeHour = 6 + (abs(crc32('wake'.$day->toDateString())) % 3);
            $wakeMin = [5, 15, 30, 45][abs(crc32('wmin'.$day->toDateString())) % 4];
            $quality = 3 + (abs(crc32('q'.$day->toDateString())) % 3);

            $bed = sprintf('%02d:%02d', $bedHour, $bedMin);
            $wake = sprintf('%02d:%02d', $wakeHour, $wakeMin);

            $user->sleepLogs()->firstOrCreate(
                ['date' => $day->toDateString()],
                [
                    'bed_time' => $bed,
                    'wake_time' => $wake,
                    'duration_minutes' => SleepLog::minutesBetween($bed, $wake),
                    'quality_rating' => $quality,
                    'notes' => $quality >= 4 ? 'Выспался, бодрое утро.' : 'Просыпался ночью.',
                ],
            );
        }

        $streaks = app(StreakService::class);
        $habits->each(fn (Habit $habit) => $streaks->recalculate($habit));
    }
}
