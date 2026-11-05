<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiAdviceTest extends TestCase
{
    use RefreshDatabase;

    public function test_fallback_advice_has_the_strict_json_shape_without_api_key(): void
    {
        config(['services.ai.key' => null]);
        Http::fake();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/ai/advice')->assertOk();

        $this->assertSame(['summary', 'recommendation', 'score'], array_keys($response->json()));
        $this->assertIsString($response->json('summary'));
        $this->assertIsString($response->json('recommendation'));
        $this->assertIsInt($response->json('score'));
        $this->assertGreaterThanOrEqual(0, $response->json('score'));
        $this->assertLessThanOrEqual(100, $response->json('score'));
        Http::assertNothingSent();
    }

    public function test_provider_answer_is_validated_and_clamped(): void
    {
        config(['services.ai.key' => 'test-key']);
        Http::fake([
            '*' => Http::response([
                'status' => 'completed',
                'model' => 'gemini-3.8-flash',
                'steps' => [[
                    'type' => 'model_output',
                    'content' => [[
                        'type' => 'text',
                        'text' => '{"summary":"Хорошо","recommendation":"Спите больше","score":185}',
                    ]],
                ]],
            ]),
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/ai/advice')
            ->assertOk()
            ->assertExactJson([
                'summary' => 'Хорошо',
                'recommendation' => 'Спите больше',
                'score' => 100,
            ]);
    }

    public function test_broken_provider_response_falls_back_safely(): void
    {
        config(['services.ai.key' => 'test-key']);
        Http::fake(['*' => Http::response('oops', 500)]);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/ai/advice')
            ->assertOk()
            ->assertJsonStructure(['summary', 'recommendation', 'score']);
    }

    public function test_advisor_endpoint_returns_personalized_recommendations(): void
    {
        config(['services.ai.key' => 'test-key']);
        Http::fake([
            '*' => Http::response([
                'status' => 'completed',
                'model' => 'gemini-3.8-flash',
                'steps' => [[
                    'type' => 'model_output',
                    'content' => [[
                        'type' => 'text',
                        'text' => json_encode([
                            'reply' => 'Ваш средний сон 7.5 ч и 80% привычек — отличный темп.',
                            'insights' => ['Стабильный график сна поддерживает стрики привычек.'],
                            'recommendations' => ['Ложитесь до 23:00 и уберите экраны за 45 минут до сна.'],
                            'score' => 86,
                        ], JSON_UNESCAPED_UNICODE),
                    ]],
                ]],
            ]),
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/advisor', [
            'avg_sleep_hours' => 7.5,
            'avg_sleep_quality' => 4.2,
            'habit_completion_percent' => 80,
            'question' => 'Как улучшить глубокий сон?',
        ])
            ->assertOk()
            ->assertJsonPath('source', 'gemini')
            ->assertJsonPath('score', 86)
            ->assertJsonPath('stats.avg_sleep_hours', 7.5)
            ->assertJsonStructure(['reply', 'insights', 'recommendations', 'score', 'source', 'model', 'stats']);
    }
}
