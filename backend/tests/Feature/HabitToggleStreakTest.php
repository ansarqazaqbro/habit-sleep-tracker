<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HabitToggleStreakTest extends TestCase
{
    use RefreshDatabase;

    public function test_toggle_updates_streak_count_and_best_streak(): void
    {
        $user = User::factory()->create();
        $habit = $user->habits()->create(['title' => 'Чтение']);

        Sanctum::actingAs($user);

        $days = [
            now()->subDays(2)->toDateString(),
            now()->subDay()->toDateString(),
            now()->toDateString(),
        ];

        foreach ($days as $date) {
            $this->postJson("/api/habits/{$habit->id}/toggle", ['date' => $date])->assertOk();
        }

        $habit->refresh();
        $this->assertSame(3, $habit->streak_count);
        $this->assertSame(3, $habit->best_streak);
        $this->assertDatabaseCount('habit_logs', 3);

        // Un-toggle today: the streak is still alive through yesterday, best stays 3.
        $this->postJson("/api/habits/{$habit->id}/toggle")
            ->assertOk()
            ->assertJsonPath('streak_count', 2)
            ->assertJsonPath('best_streak', 3)
            ->assertJsonPath('completed_today', false);

        $this->assertDatabaseCount('habit_logs', 2);
    }

    public function test_gap_resets_current_streak(): void
    {
        $user = User::factory()->create();
        $habit = $user->habits()->create(['title' => 'Бег']);

        Sanctum::actingAs($user);

        // Completed 4 and 3 days ago, nothing since: current streak is 0, best is 2.
        foreach ([4, 3] as $offset) {
            $this->postJson("/api/habits/{$habit->id}/toggle", [
                'date' => now()->subDays($offset)->toDateString(),
            ])->assertOk();
        }

        $habit->refresh();
        $this->assertSame(0, $habit->streak_count);
        $this->assertSame(2, $habit->best_streak);
    }

    public function test_toggle_rejects_invalid_and_future_dates(): void
    {
        $user = User::factory()->create();
        $habit = $user->habits()->create(['title' => 'Йога']);

        Sanctum::actingAs($user);

        $this->postJson("/api/habits/{$habit->id}/toggle", ['date' => '20-10-2026'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');

        $this->postJson("/api/habits/{$habit->id}/toggle", ['date' => now()->addDays(3)->toDateString()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('date');
    }
}
