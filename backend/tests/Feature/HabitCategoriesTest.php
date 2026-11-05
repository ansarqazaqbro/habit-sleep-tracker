<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HabitCategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_habit_is_created_with_many_to_many_categories(): void
    {
        $user = User::factory()->create();
        $health = Category::create(['title' => 'Здоровье', 'icon' => 'heart', 'color' => '#67e8f9']);
        $sleep = Category::create(['title' => 'Сон', 'icon' => 'moon', 'color' => '#93c5fd']);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/habits', [
            'title' => 'Вечерняя растяжка',
            'category_ids' => [$health->id, $sleep->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('title', 'Вечерняя растяжка')
            ->assertJsonPath('streak_count', 0)
            ->assertJsonCount(2, 'categories');

        $habitId = $response->json('id');

        $this->assertDatabaseHas('category_habit', ['habit_id' => $habitId, 'category_id' => $health->id]);
        $this->assertDatabaseHas('category_habit', ['habit_id' => $habitId, 'category_id' => $sleep->id]);

        // Both sides of the relation resolve.
        $habit = $user->habits()->findOrFail($habitId);
        $this->assertEqualsCanonicalizing(
            [$health->id, $sleep->id],
            $habit->categories->pluck('id')->all(),
        );
        $this->assertSame($habitId, $health->habits()->first()->id);
    }

    public function test_unknown_category_ids_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/habits', [
            'title' => 'Что-то',
            'category_ids' => [9999],
        ])->assertUnprocessable()->assertJsonValidationErrors(['category_ids.0']);
    }
}
