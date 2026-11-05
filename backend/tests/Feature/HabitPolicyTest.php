<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HabitPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_modify_or_view_another_users_habit(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $habit = $owner->habits()->create(['title' => 'Приватная привычка']);

        Sanctum::actingAs($intruder);

        $this->putJson("/api/habits/{$habit->id}", ['title' => 'Взлом'])->assertForbidden();
        $this->getJson("/api/habits/{$habit->id}")->assertForbidden();
        $this->postJson("/api/habits/{$habit->id}/toggle")->assertForbidden();
        $this->deleteJson("/api/habits/{$habit->id}")->assertForbidden();

        $this->assertDatabaseHas('habits', ['id' => $habit->id, 'title' => 'Приватная привычка']);
        $this->assertDatabaseCount('habit_logs', 0);
    }

    public function test_owner_can_modify_own_habit(): void
    {
        $owner = User::factory()->create();
        $habit = $owner->habits()->create(['title' => 'Старое']);

        Sanctum::actingAs($owner);

        $this->putJson("/api/habits/{$habit->id}", ['title' => 'Новое'])
            ->assertOk()
            ->assertJsonPath('title', 'Новое');
    }

    public function test_regular_user_cannot_access_admin_category_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/categories')->assertForbidden();
        $this->postJson('/api/admin/categories', ['title' => 'Новая'])->assertForbidden();
    }

    public function test_admin_can_manage_categories(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/admin/categories', [
            'title' => 'Финансы',
            'icon' => 'wallet',
            'color' => '#ffaa00',
        ])->assertCreated()->assertJsonPath('title', 'Финансы');

        $this->assertDatabaseHas('categories', ['title' => 'Финансы']);
    }
}
