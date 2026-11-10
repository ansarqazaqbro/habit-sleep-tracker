<?php

namespace App\Services;

use App\Models\User;

/**
 * Аналитический движок AI-консультанта Lumen (Lumen Assistant).
 *
 * Работает мгновенно на основе реальной статистики пользователя из БД
 * (сон + привычки за 7 дней), без зависаний на внешних сетевых таймаутах.
 */
class AiService
{
    public function __construct(
        private readonly SleepAnalyticsService $sleepAnalytics,
    ) {}

    /**
     * @param  array{avg_sleep_hours?: float|int|null, avg_sleep_quality?: float|int|null, habit_completion_percent?: float|int|null}  $stats
     * @param  array<int, array{role: string, text: string}>  $history
     * @return array{reply: string, insights: list<string>, recommendations: list<string>, score: int, source: string, model: string|null, stats: array<string, mixed>}
     */
    public function advise(User $user, array $stats = [], ?string $question = null, array $history = []): array
    {
        $context = $this->buildContext($user);

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

        return $this->buildStructuredAdvice($context, $question) + [
            'source' => 'lumen-assistant',
            'model' => 'Lumen Routine Engine',
            'stats' => $this->publicStats($context),
        ];
    }

    /**
     * @return array{summary: string, recommendation: string, score: int}
     */
    public function generateAdvice(User $user): array
    {
        $context = $this->buildContext($user);

        return $this->fallback($context);
    }

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
    private function buildStructuredAdvice(array $context, ?string $question): array
    {
        $base = $this->fallback($context);
        $hours = (float) $context['sleep_average_hours'];
        $quality = (float) $context['sleep_average_quality'];
        $habits = (int) $context['habit_completion_percent'];
        $regularity = (int) $context['sleep_regularity_percent'];

        $insights = [
            $hours >= 7
                ? "Средняя продолжительность сна {$hours} ч — в пределах целевого окна 7–9 часов."
                : "Средняя продолжительность сна {$hours} ч — ниже рекомендуемой нормы 7–8 часов.",
            "Регулярность отхода ко сну составляет {$regularity}%, субъективное качество — {$quality}/5.",
            "Дисциплина привычек за последние 7 дней: {$habits}% (активных привычек: {$context['habits_count']}).",
        ];

        $recommendations = [
            $base['recommendation'],
            $quality < 3.8
                ? 'Добавьте вечернее дыхание 4-7-8 в 21:40 и уберите экраны за 60 минут до сна.'
                : 'Фиксируйте время утреннего подъёма в пределах ±20 минут даже в выходные дни.',
            'Используйте быстрые команды ниже, чтобы AI-консультант Lumen автоматически обновил ваше расписание.',
        ];

        $reply = $base['summary'];
        if ($question !== null && $question !== '') {
            $lower = mb_strtolower($question);
            if (str_contains($lower, 'подъём') || str_contains($lower, '07:00') || str_contains($lower, 'вста')) {
                $reply = "Чтобы стабильно вставать в 07:00 без недосыпа при текущем среднем сне {$hours} ч, зафиксируйте отбой не позднее 23:00 и поставьте утренний свет + стакан воды сразу после пробуждения.";
            } elseif (str_contains($lower, 'вечер') || str_contains($lower, 'засыпа')) {
                $reply = "Для быстрого засыпания при текущем качестве {$quality}/5 лучше всего работают 3 шага: отказ от экранов за 60 минут до сна, перенос чтения на более раннее время и дыхание 4-7-8.";
            } elseif (str_contains($lower, 'недел') || str_contains($lower, 'улучш')) {
                $reply = "Разбор недели: привычки закрыты на {$habits}%, сон — {$hours} ч (регулярность {$regularity}%). Главный рычаг роста — выровнять время отбоя и привязать вечерние привычки к фиксированному часу.";
            } else {
                $reply = "{$base['summary']} {$base['recommendation']}";
            }
        }

        return [
            'reply' => $reply,
            'insights' => $insights,
            'recommendations' => $recommendations,
            'score' => $base['score'],
        ];
    }

    /**
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
            ? "Привычки выполняются на {$habitScore}% за неделю, записей о сне за последние дни пока нет."
            : "За последние 7 дней выполнено {$habitScore}% привычек, средний сон — {$sleepHours} ч (качество {$quality}/5).";

        if ($nights === 0) {
            $recommendation = 'Запишите хотя бы три ночи сна — так консультант свяжет ваш режим восстановления с привычками.';
        } elseif ($sleepHours < 7) {
            $recommendation = 'Сдвиньте отход ко сну на 35–40 минут раньше сегодня: дефицит сна сильнее всего снижает регулярность привычек.';
        } elseif ($regularity < 60) {
            $recommendation = 'Зафиксируйте единое время отхода ко сну (±25 минут) на всю неделю.';
        } elseif ($habitScore < 60) {
            $recommendation = 'Сфокусируйтесь на 3 ключевых привычках и привяжите их к точному времени утром и вечером.';
        } else {
            $recommendation = 'Отличный баланс режима! Поддерживайте текущее окно сна и ритм привычек.';
        }

        return [
            'summary' => $summary,
            'recommendation' => $recommendation,
            'score' => $score,
        ];
    }
}
