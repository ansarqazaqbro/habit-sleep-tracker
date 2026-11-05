<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SleepLogStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sleep_log_is_stored_and_weekly_stats_are_calculated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // 3 nights: 8h, 8h, 6h (all crossing midnight) with ratings 5, 4, 3.
        $nights = [
            [2, '23:00', '07:00', 5],
            [1, '23:00', '07:00', 4],
            [0, '23:00', '05:00', 3],
        ];

        foreach ($nights as [$offset, $bed, $wake, $rating]) {
            $this->postJson('/api/sleep', [
                'bed_time' => $bed,
                'wake_time' => $wake,
                'quality_rating' => $rating,
                'date' => now()->subDays($offset)->toDateString(),
            ])->assertCreated();
        }

        $this->assertDatabaseCount('sleep_logs', 3);

        $first = $this->getJson('/api/sleep')->assertOk()->json();
        $this->assertCount(3, $first);

        $this->getJson('/api/sleep/stats')
            ->assertOk()
            ->assertJsonStructure([
                'average_minutes', 'average_hours', 'average_quality', 'goal_percent',
                'nights_logged', 'regularity', 'recommendation',
                'chart' => [['date', 'label', 'hours', 'minutes', 'quality', 'goal_percent']],
            ])
            ->assertJsonCount(7, 'chart')
            ->assertJsonPath('nights_logged', 3)
            ->assertJsonPath('average_minutes', 440) // (480 + 480 + 360) / 3
            ->assertJsonPath('average_quality', 4)
            ->assertJsonPath('regularity', 100);
    }

    public function test_sleep_log_response_includes_duration_and_validates_rating(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/sleep', [
            'bed_time' => '23:30',
            'wake_time' => '07:15',
            'quality_rating' => 4,
        ])
            ->assertCreated()
            ->assertJsonPath('duration_minutes', 465)
            ->assertJsonPath('duration.hours', 7)
            ->assertJsonPath('duration.minutes', 45);

        $this->postJson('/api/sleep', [
            'bed_time' => '23:30',
            'wake_time' => '07:15',
            'quality_rating' => 6,
        ])->assertUnprocessable()->assertJsonValidationErrors('quality_rating');
    }

    public function test_user_cannot_read_another_users_sleep_log(): void
    {
        $owner = User::factory()->create();
        $log = $owner->sleepLogs()->create([
            'bed_time' => '23:00',
            'wake_time' => '07:00',
            'duration_minutes' => 480,
            'quality_rating' => 4,
            'date' => now()->toDateString(),
        ]);

        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/sleep/{$log->id}")->assertForbidden();
    }
}
