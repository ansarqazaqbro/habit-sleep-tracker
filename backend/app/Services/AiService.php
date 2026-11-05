<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Интеграция с Google Gemini API (Interactions API, REST).
 *
 * Схема работы:
 *  1. Собираем статистику пользователя из БД (сон + привычки за 7 дней).
 *  2. Отправляем её в Gemini вместе с системным промптом консультанта.
 *  3. Просим строгий JSON по схеме (structured output) и валидируем ответ.
 *  4. Если ключа нет / сеть недоступна / модель перегружена — отдаём
 *     детерминированный локальный анализ (fallback), чтобы UI никогда не ломался.
 */
class AiService
{
    /** Системный промпт персонального консультанта по сну и продуктивности. */
    private const ADVISOR_SYSTEM_PROMPT = <<<'PROMPT'
Ты — Lumen AI, персональный консультант по сну и продуктивности внутри трекера привычек и сна.

Правила:
- Отвечай только на русском языке, обращайся к пользователю на «вы», тон тёплый и поддерживающий.
- Опирайся ТОЛЬКО на переданную статистику: среднюю длительность сна, качество сна (1–5),
  регулярность отхода ко сну, процент выполнения привычек за неделю и стрики. Цитируй конкретные цифры.
- Будь краток: reply — 2–4 предложения; insights — 2–3 наблюдения о взаимосвязях сна и привычек;
  recommendations — 2–3 конкретных, выполнимых действия на ближайшие дни (не общие фразы).
- Норма сна для взрослого — 7–9 часов. Ориентир пользователя — 8 часов.
- Если пользователь задаёт вопрос — отвечай на него в reply с учётом его данных.
- Не ставь медицинских диагнозов. При хронической бессоннице или тревожных симптомах мягко советуй обратиться к врачу.
- score — общий балл баланса сна и привычек от 0 до 100.
PROMPT;

    /** JSON Schema ответа консультанта (structured output). */
    private const ADVISOR_SCHEMA = [
        'type' => 'object',
        'properties' => [
            'reply' => ['type' => 'string', 'description' => 'Короткий персональный ответ (2–4 предложения).'],
            'insights' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => '2–3 инсайта по данным.'],
            'recommendations' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => '2–3 конкретных совета.'],
            'score' => ['type' => 'integer', 'description' => 'Общий балл 0–100.'],
        ],
        'required' => ['reply', 'insights', 'recommendations', 'score'],
    ];

    public function __construct(
        private readonly SleepAnalyticsService $sleepAnalytics,
    ) {}

    /* ---------------------------------------------------------------------
     |  POST /api/ai/advisor — AI-консультант (чат + рекомендации)
     * -------------------------------------------------------------------*/

    /**
     * @param  array{avg_sleep_hours?: float|int|null, avg_sleep_quality?: float|int|null, habit_completion_percent?: float|int|null}  $stats
     *         Статистика, присланная клиентом. Пустые поля дополняются данными из БД.
     * @param  array<int, array{role: string, text: string}>  $history  Последние реплики чата.
     * @return array{reply: string, insights: list<string>, recommendations: list<string>, score: int, source: string, model: string|null, stats: array<string, mixed>}
     */
    public function advise(User $user, array $stats = [], ?string $question = null, array $history = []): array
    {
        $context = $this->buildContext($user);

        // Клиент может передать свою статистику (например, текущую с дашборда) — она приоритетнее.
        if (isset($stats['avg_sleep_hours'])) {
            $context['sleep_average_hours'] = round((float) $stats['avg_sleep_hours'], 2);
        }
        if (isset($stats['avg_sleep_quality'])) {
            $context['sleep_average_quality'] = round((float) $stats['avg_sleep_quality'], 1);
        }
        if (isset($stats['habit_completion_percent'])) {
            $context['habit_completion_percent'] = (int) round((float) $stats['habit_completion_percent']);
        }

        $question = $question !== null ? trim($question) : null;
        $input = $this->buildAdvisorInput($context, $question, $history);

        $result = $this->callGemini(self::ADVISOR_SYSTEM_PROMPT, $input, self::ADVISOR_SCHEMA);
        $advice = $result ? $this->normalizeAdvisor($result['data']) : null;

        if ($advice !== null) {
            return $advice + [
                'source' => 'gemini',
                'model' => $result['model'],
                'stats' => $this->publicStats($context),
            ];
        }

        return $this->advisorFallback($context, $question) + [
            'source' => 'fallback',
            'model' => null,
            'stats' => $this->publicStats($context),
        ];
    }

    /* ---------------------------------------------------------------------
     |  GET /api/ai/advice — короткая карточка совета на дашборде сна
     * -------------------------------------------------------------------*/

    /**
     * Always returns exactly: ['summary' => string, 'recommendation' => string, 'score' => int 0-100].
     *
     * @return array{summary: string, recommendation: string, score: int}
     */
    public function generateAdvice(User $user): array
    {
        $context = $this->buildContext($user);

        $result = $this->callGemini(
            'Ты — заботливый коуч по привычкам и сну. Отвечай на русском языке, кратко и по делу.',
            "Проанализируй данные пользователя за последние 7 дней и верни JSON: summary (1-2 предложения о текущем состоянии), "
                ."recommendation (один конкретный совет на завтра), score (целое 0-100, общий балл).\n\nДанные:\n"
                .json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            [
                'type' => 'object',
                'properties' => [
                    'summary' => ['type' => 'string'],
                    'recommendation' => ['type' => 'string'],
                    'score' => ['type' => 'integer'],
                ],
                'required' => ['summary', 'recommendation', 'score'],
            ],
        );

        $data = $result['data'] ?? null;

        if (is_array($data)
            && is_string($data['summary'] ?? null)
            && is_string($data['recommendation'] ?? null)
            && is_numeric($data['score'] ?? null)
        ) {
            return [
                'summary' => trim($data['summary']),
                'recommendation' => trim($data['recommendation']),
                'score' => $this->clampScore($data['score']),
            ];
        }

        return $this->fallback($context);
    }

    /* ---------------------------------------------------------------------
     |  Данные пользователя
     * -------------------------------------------------------------------*/

    /**
     * @return array<string, mixed>
     */
    public function buildContext(User $user): array
    {
        $sleep = $this->sleepAnalytics->getWeeklySummary($user->id);
        $habits = $user->habits()->get();

        $since = now()->subDays(6)->toDateString();
        $completions = $user->habitLogs()
            ->where('status', 'completed')
            ->whereDate('completed_at', '>=', $since)
            ->count();

        $possible = max(1, $habits->count() * 7);

        return [
            'habits_count' => $habits->count(),
            'habit_completion_percent' => (int) round(min(1, $completions / $possible) * 100),
            'best_current_streak' => (int) $habits->max('streak_count'),
            'best_ever_streak' => (int) $habits->max('best_streak'),
            'habits' => $habits->map(fn ($habit) => [
                'title' => $habit->title,
                'streak' => $habit->streak_count,
            ])->values()->all(),
            'sleep_average_hours' => $sleep['average_hours'],
            'sleep_average_quality' => $sleep['average_quality'],
            'sleep_regularity_percent' => $sleep['regularity'],
            'sleep_nights_logged' => $sleep['nights_logged'],
        ];
    }

    /* ---------------------------------------------------------------------
     |  Gemini Interactions API
     * -------------------------------------------------------------------*/

    /**
     * Отправляет запрос в Gemini и возвращает распарсенный JSON-ответ модели.
     * Перебирает основную и резервные модели (на случай 503 / 429).
     *
     * @param  array<string, mixed>  $schema
     * @return array{data: array<string, mixed>, model: string}|null
     */
    private function callGemini(string $systemInstruction, string $input, array $schema): ?array
    {
        $apiKey = (string) config('services.ai.key');

        if ($apiKey === '') {
            return null;
        }

        $endpoint = rtrim((string) config('services.ai.endpoint'), '/').'/interactions';
        $models = array_values(array_unique(array_filter([
            (string) config('services.ai.model'),
            ...((array) config('services.ai.fallback_models', [])),
        ])));

        foreach ($models as $model) {
            try {
                $response = Http::timeout((int) config('services.ai.timeout', 20))
                    ->withHeaders(['x-goog-api-key' => $apiKey])
                    ->acceptJson()
                    ->post($endpoint, [
                        'model' => $model,
                        'system_instruction' => $systemInstruction,
                        'input' => $input,
                        'store' => false, // не храним диалог на стороне Google
                        'response_format' => [
                            'type' => 'text',
                            'mime_type' => 'application/json',
                            'schema' => $schema,
                        ],
                    ]);
            } catch (Throwable $exception) {
                Log::warning('Gemini request failed.', ['model' => $model, 'error' => $exception->getMessage()]);

                continue;
            }

            if (! $response->successful()) {
                Log::warning('Gemini returned an error status.', [
                    'model' => $model,
                    'status' => $response->status(),
                    'error' => data_get($response->json(), 'error.message'),
                ]);

                // 4xx (кроме 429) — ошибка запроса/ключа, другая модель не поможет.
                if ($response->clientError() && $response->status() !== 429) {
                    return null;
                }

                continue;
            }

            $data = $this->decodeJson($this->extractText((array) $response->json()));

            if ($data !== null) {
                return ['data' => $data, 'model' => (string) ($response->json('model') ?? $model)];
            }
        }

        return null;
    }

    /**
     * Ответ Interactions API: steps[] → шаг type=model_output → content[] → type=text.
     *
     * @param  array<string, mixed>  $payload
     */
    private function extractText(array $payload): string
    {
        $text = '';

        foreach ((array) ($payload['steps'] ?? []) as $step) {
            if (($step['type'] ?? null) !== 'model_output') {
                continue;
            }

            $text = '';
            foreach ((array) ($step['content'] ?? []) as $part) {
                if (($part['type'] ?? null) === 'text') {
                    $text .= (string) ($part['text'] ?? '');
                }
            }
        }

        return $text;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeJson(string $raw): ?array
    {
        $raw = trim(preg_replace('/^```(?:json)?|```$/m', '', trim($raw)) ?? '');
        $data = json_decode($raw, true);

        return is_array($data) ? $data : null;
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array<int, array{role: string, text: string}>  $history
     */
    private function buildAdvisorInput(array $context, ?string $question, array $history): string
    {
        $parts = [
            "Статистика пользователя за последние 7 дней:\n"
                .json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        ];

        if ($history !== []) {
            $lines = array_map(
                fn (array $turn) => ($turn['role'] === 'user' ? 'Пользователь' : 'Консультант').': '.$turn['text'],
                array_slice($history, -6),
            );
            $parts[] = "Предыдущие сообщения диалога:\n".implode("\n", $lines);
        }

        $parts[] = $question
            ? "Вопрос пользователя: {$question}"
            : 'Сделай персональный разбор недели: что получается хорошо, что мешает и что улучшить в первую очередь.';

        return implode("\n\n", $parts);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{reply: string, insights: list<string>, recommendations: list<string>, score: int}|null
     */
    private function normalizeAdvisor(array $data): ?array
    {
        if (! is_string($data['reply'] ?? null) || trim($data['reply']) === '') {
            return null;
        }

        $list = fn ($items) => array_values(array_slice(array_filter(
            array_map(fn ($item) => is_string($item) ? trim($item) : '', (array) $items),
        ), 0, 4));

        return [
            'reply' => trim($data['reply']),
            'insights' => $list($data['insights'] ?? []),
            'recommendations' => $list($data['recommendations'] ?? []),
            'score' => $this->clampScore($data['score'] ?? $this->localScore([])),
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function publicStats(array $context): array
    {
        return [
            'avg_sleep_hours' => (float) $context['sleep_average_hours'],
            'avg_sleep_quality' => (float) $context['sleep_average_quality'],
            'habit_completion_percent' => (int) $context['habit_completion_percent'],
            'sleep_regularity_percent' => (int) $context['sleep_regularity_percent'],
            'nights_logged' => (int) $context['sleep_nights_logged'],
            'habits_count' => (int) $context['habits_count'],
        ];
    }

    private function clampScore(mixed $score): int
    {
        return max(0, min(100, (int) round((float) $score)));
    }

    /* ---------------------------------------------------------------------
     |  Локальный анализ (fallback без сети / ключа)
     * -------------------------------------------------------------------*/

    /**
     * @param  array<string, mixed>  $context
     */
    private function localScore(array $context): int
    {
        if ($context === []) {
            return 50;
        }

        $habitScore = (int) $context['habit_completion_percent'];
        $sleepHours = (float) $context['sleep_average_hours'];
        $quality = (float) $context['sleep_average_quality'];
        $regularity = (int) $context['sleep_regularity_percent'];
        $nights = (int) $context['sleep_nights_logged'];

        if ($nights === 0 && $sleepHours <= 0) {
            return $this->clampScore($habitScore * 0.6);
        }

        $sleepScore = min(1, $sleepHours / 8) * 50 + ($quality / 5) * 30 + ($regularity / 100) * 20;

        return $this->clampScore($habitScore * 0.5 + $sleepScore * 0.5);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array{reply: string, insights: list<string>, recommendations: list<string>, score: int}
     */
    private function advisorFallback(array $context, ?string $question): array
    {
        $base = $this->fallback($context);
        $hours = (float) $context['sleep_average_hours'];
        $quality = (float) $context['sleep_average_quality'];
        $habits = (int) $context['habit_completion_percent'];
        $regularity = (int) $context['sleep_regularity_percent'];

        $insights = [
            $hours >= 7
                ? "Сон в среднем {$hours} ч — в пределах нормы 7–9 часов."
                : "Сон в среднем {$hours} ч — меньше нормы в 7–9 часов.",
            "Регулярность отхода ко сну — {$regularity}%, качество сна — {$quality}/5.",
            "Привычки выполнены на {$habits}% за неделю.",
        ];

        $recommendations = [$base['recommendation']];
        $recommendations[] = $quality < 3.5
            ? 'За час до сна приглушите свет и уберите телефон — это быстрее всего поднимает качество сна.'
            : 'Отмечайте привычки в одно и то же время суток — так они быстрее становятся автоматическими.';

        $reply = $question
            ? 'AI-сервис сейчас недоступен, поэтому отвечаю на основе локального анализа ваших данных. '.$base['summary']
            : $base['summary'];

        return [
            'reply' => $reply,
            'insights' => $insights,
            'recommendations' => $recommendations,
            'score' => $base['score'],
        ];
    }

    /**
     * Deterministic, offline advice. Safe default when no API key is available.
     *
     * @param  array<string, mixed>  $context
     * @return array{summary: string, recommendation: string, score: int}
     */
    private function fallback(array $context): array
    {
        $habitScore = $context['habit_completion_percent'];
        $sleepHours = (float) $context['sleep_average_hours'];
        $quality = (float) $context['sleep_average_quality'];
        $regularity = (int) $context['sleep_regularity_percent'];
        $nights = (int) $context['sleep_nights_logged'];

        $score = $this->localScore($context);

        $summary = $nights === 0
            ? "Привычки выполняются на {$habitScore}% за неделю, данных о сне пока нет."
            : "За неделю выполнено {$habitScore}% привычек, сон в среднем {$sleepHours} ч с качеством {$quality}/5.";

        if ($nights === 0) {
            $recommendation = 'Запишите хотя бы три ночи сна — так мы сможем связать ваш режим с привычками.';
        } elseif ($sleepHours < 7) {
            $recommendation = 'Ложитесь на 30–40 минут раньше сегодня: недосып сильнее всего бьёт по постоянству привычек.';
        } elseif ($regularity < 60) {
            $recommendation = 'Выберите фиксированное время отхода ко сну и держитесь его ±30 минут всю неделю.';
        } elseif ($habitScore < 60) {
            $recommendation = 'Сократите список до 2–3 ключевых привычек и закрепляйте их в одно и то же время дня.';
        } else {
            $recommendation = 'Отличный ритм! Поддерживайте текущий режим и постепенно добавьте одну новую привычку.';
        }

        return [
            'summary' => $summary,
            'recommendation' => $recommendation,
            'score' => $score,
        ];
    }
}
