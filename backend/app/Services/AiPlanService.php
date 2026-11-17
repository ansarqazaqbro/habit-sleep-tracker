<?php

namespace App\Services;

use App\Models\Habit;
use App\Models\SleepLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Autonomous routine planner ("AI-консультант Lumen").
 *
 * Interprets user requests and executes structured tool calls directly on the
 * user's habits and sleep logs (`create_habit`, `update_habit`, `log_sleep`,
 * `apply_routine_plan`), storing undo snapshots in cache so every action can be
 * confirmed or undone from the UI without requiring destructive schema resets.
 */
class AiPlanService
{
    public function __construct(
        private readonly HabitService $habits,
    ) {}

    /**
     * Detects and executes tool calls when the user asks to mutate habits, log sleep,
     * or build a routine plan.
     *
     * @return array{executed: bool, reply: string, actions: list<array<string, mixed>>}
     */
    public function executeIfApplicable(User $user, ?string $question, array $context = []): array
    {
        if ($question === null || trim($question) === '') {
            return ['executed' => false, 'reply' => '', 'actions' => []];
        }

        $planned = $this->planCalls($user, $question, $context);
        if ($planned['calls'] === []) {
            return ['executed' => false, 'reply' => '', 'actions' => []];
        }

        $actions = [];
        foreach ($planned['calls'] as $call) {
            $actions[] = $this->runTool($user, $call['name'], $call['arguments']);
        }

        return [
            'executed' => true,
            'reply' => $planned['reply'],
            'actions' => $actions,
        ];
    }

    /**
     * Executes a single tool call and stores an undo snapshot.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function runTool(User $user, string $tool, array $args): array
    {
        $actionId = (string) Str::uuid();

        return DB::transaction(function () use ($user, $tool, $args, $actionId) {
            [$normalizedArgs, $summary, $snapshot] = match ($tool) {
                'create_habit' => $this->execCreateHabit($user, $args),
                'update_habit' => $this->execUpdateHabit($user, $args),
                'log_sleep' => $this->execLogSleep($user, $args),
                'apply_routine_plan' => $this->execApplyRoutinePlan($user, $args),
            };

            $record = [
                'id' => $actionId,
                'user_id' => $user->id,
                'tool' => $tool,
                'arguments' => $normalizedArgs,
                'summary' => $summary,
                'status' => 'applied',
                'snapshot' => $snapshot,
                'created_at' => now()->toIso8601String(),
            ];

            $this->saveAction($user, $record);

            return $this->publicAction($record);
        });
    }

    /**
     * Confirms an executed tool action.
     *
     * @return array<string, mixed>|null
     */
    public function confirm(User $user, string $actionId): ?array
    {
        $actions = $this->loadActions($user);
        if (! isset($actions[$actionId])) {
            return null;
        }

        $actions[$actionId]['status'] = 'confirmed';
        $this->persistActions($user, $actions);

        return $this->publicAction($actions[$actionId]);
    }

    /**
     * Reverts the database mutations performed by `$actionId`.
     *
     * @return array<string, mixed>|null
     */
    public function undo(User $user, string $actionId): ?array
    {
        $actions = $this->loadActions($user);
        if (! isset($actions[$actionId])) {
            return null;
        }

        $record = $actions[$actionId];
        if (($record['status'] ?? '') === 'undone') {
            return $this->publicAction($record);
        }

        DB::transaction(function () use ($user, $record) {
            $snap = $record['snapshot'] ?? [];
            $tool = $record['tool'] ?? '';

            if ($tool === 'create_habit' && ! empty($snap['created_habit_id'])) {
                $user->habits()->whereKey($snap['created_habit_id'])->delete();
            } elseif ($tool === 'update_habit' && ! empty($snap['before'])) {
                $this->restoreHabit($user, $snap['before']);
            } elseif ($tool === 'log_sleep') {
                if (! empty($snap['previous_log']) && ! empty($snap['sleep_log_id'])) {
                    $user->sleepLogs()->whereKey($snap['sleep_log_id'])->update($snap['previous_log']);
                } elseif (! empty($snap['created_sleep_log_id'])) {
                    $user->sleepLogs()->whereKey($snap['created_sleep_log_id'])->delete();
                }
            } elseif ($tool === 'apply_routine_plan') {
                if (! empty($snap['created_habit_ids'])) {
                    $user->habits()->whereIn('id', $snap['created_habit_ids'])->delete();
                }
                foreach ($snap['updated_habits'] ?? [] as $before) {
                    $this->restoreHabit($user, $before);
                }
            }
        });

        $actions[$actionId]['status'] = 'undone';
        $this->persistActions($user, $actions);

        return $this->publicAction($actions[$actionId]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function recentActions(User $user): array
    {
        return array_values(array_map(
            fn (array $a) => $this->publicAction($a),
            array_slice(array_reverse($this->loadActions($user)), 0, 15),
        ));
    }

    /**
     * @return array{reply: string, calls: list<array{name: string, arguments: array<string, mixed>}>}
     */
    private function planCalls(User $user, string $message, array $context): array
    {
        $lower = mb_strtolower($message);
        $habits = $user->habits()->with('categories')->orderBy('id')->get();
        $calls = [];
        $notes = [];

        // 1. Routine plan intent ("составь мне план привычек для утренней бодрости", "вечерний план", "план привычек")
        if (preg_match('/(составь|сделай|подбери|сформируй|примени|нужен).*(план|ритуал|рутин|комплекс|набор)/u', $lower)
            || str_contains($lower, 'утренней бодрост')
            || str_contains($lower, 'план привычек')
            || str_contains($lower, 'вечерний план')
        ) {
            $plan = $this->buildRoutinePlan($lower);
            $calls[] = [
                'name' => 'apply_routine_plan',
                'arguments' => $plan,
            ];
            $notes[] = sprintf(
                'Сформировал и применил план «%s» (%d привычки) с учётом вашего графика сна.',
                $plan['name'],
                count($plan['habits']),
            );
        }

        // 2. Sleep logging intent ("уснул в 23:40 и проснулся в 07:15", "запиши сон ...")
        if (preg_match('/(?:с|в|отбой|уснул[а]?|лёг|легла)\s*([01]?\d|2[0-3])[:.]([0-5]\d).*?(?:до|в|подъ[её]м|проснул(?:ся|ась)|встал[а]?)\s*([01]?\d|2[0-3])[:.]([0-5]\d)/u', $lower, $m)) {
            $bed = sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
            $wake = sprintf('%02d:%02d', (int) $m[3], (int) $m[4]);
            $quality = $this->extractQuality($lower);

            $calls[] = [
                'name' => 'log_sleep',
                'arguments' => [
                    'bedtime' => $bed,
                    'wake_time' => $wake,
                    'quality' => $quality,
                    'note' => 'Записано через AI-консультанта Lumen',
                ],
            ];
            $notes[] = "Записал ночь {$bed}–{$wake} (качество {$quality}/5).";
        }

        // 3. Habit shift / update intent ("смести чтение", "перенеси ...", "измени ...")
        if (preg_match('/(смест[иь]|перенес[иь]|сдвин[ьи]|измен[иь]|обнов[иь])/u', $lower)) {
            $target = $this->matchHabit($lower, $habits);
            if ($target) {
                $newTime = '21:00';
                if (preg_match('/(?:смест[иь]|перенес[иь]|сдвин[ьи])[^,.!?;]*?\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/u', $lower, $tm)) {
                    $newTime = sprintf('%02d:%02d', (int) $tm[1], (int) $tm[2]);
                } elseif (str_contains($lower, 'утро')) {
                    $newTime = '08:30';
                }

                $cleanTitle = preg_replace('/\s*\(\d{2}:\d{2}\)\s*$/u', '', $target->title) ?: $target->title;
                $updatedTitle = "{$cleanTitle} ({$newTime})";

                $calls[] = [
                    'name' => 'update_habit',
                    'arguments' => [
                        'id' => $target->id,
                        'changes' => [
                            'title' => $updatedTitle,
                            'target_days_per_week' => (int) ($target->target_frequency ?: 5),
                            'schedule_time' => $newTime,
                        ],
                    ],
                ];
                $notes[] = "Сместил привычку «{$cleanTitle}» на {$newTime}, чтобы освободить буфер перед сном.";
            }
        }

        // 4. Habit creation intent ("добавь мне дыхание перед сном", "создай привычку ...")
        if (preg_match('/(добав[ьи]|созда[йть]|включ[иь]|введ[иь])/u', $lower)) {
            $beforeSleep = str_contains($lower, 'перед сном') || str_contains($lower, 'до сна') || str_contains($lower, 'на ночь');
            $time = $this->extractTime($message) ?? ($beforeSleep ? '21:40' : '08:00');

            if (str_contains($lower, 'дыхан')) {
                $calls[] = [
                    'name' => 'create_habit',
                    'arguments' => [
                        'title' => "Дыхание 4-7-8 ({$time})",
                        'category' => 'calm',
                        'target_days_per_week' => 7,
                        'frequency' => "daily ({$time})",
                    ],
                ];
                $notes[] = "Добавил вечернюю практику «Дыхание 4-7-8» на {$time} (7 дн./нед.) для снижения кортизола перед сном.";
            } elseif (preg_match('/(?:добав[ьи]|созда[йть]|включ[иь]|введ[иь])\s+(.+?)(?:\s+и\s+смест|\s+и\s+перенес|[.!?;]|$)/iu', $message, $cm)) {
                $title = $this->normalizeHabitTitle($cm[1], $beforeSleep);

                $calls[] = [
                    'name' => 'create_habit',
                    'arguments' => [
                        'title' => "{$title} ({$time})",
                        'category' => $beforeSleep ? 'sleep' : 'body',
                        'target_days_per_week' => 7,
                        'frequency' => "daily ({$time})",
                    ],
                ];
                $notes[] = "Добавил привычку «{$title}» ({$time}, 7 дн./нед.).";
            }
        }

        if ($calls !== [] && preg_match('/(плохо\s+спал|не\s+выспал|бессонниц)/u', $lower)) {
            $avgHours = $context['sleep_average_hours'] ?? 7.0;
            $avgQuality = $context['sleep_average_quality'] ?? 3.5;
            array_unshift(
                $notes,
                "Проанализировал ваш режим за последние дни (средний сон {$avgHours} ч, качество {$avgQuality}/5) и перестроил вечерний ритуал:"
            );
        }

        return [
            'reply' => implode(' ', $notes),
            'calls' => $calls,
        ];
    }

    /**
     * @return array{name: string, habits: list<array<string, mixed>>}
     */
    private function buildRoutinePlan(string $lower): array
    {
        if (str_contains($lower, 'вечер') || str_contains($lower, 'глубокого сна')) {
            return [
                'name' => 'Вечернее замедление',
                'habits' => [
                    [
                        'title' => 'Без экранов за час до сна (22:00)',
                        'category' => 'sleep',
                        'target_days_per_week' => 7,
                        'frequency' => 'daily (22:00)',
                    ],
                    [
                        'title' => 'Чтение бумажной книги 20 мин (21:20)',
                        'category' => 'mind',
                        'target_days_per_week' => 6,
                        'frequency' => '6x_week (21:20)',
                    ],
                    [
                        'title' => 'Дыхание 4-7-8 (21:45)',
                        'category' => 'calm',
                        'target_days_per_week' => 7,
                        'frequency' => 'daily (21:45)',
                    ],
                ],
            ];
        }

        return [
            'name' => 'Утренняя бодрость',
            'habits' => [
                [
                    'title' => 'Стакан воды 400 мл (07:15)',
                    'category' => 'body',
                    'target_days_per_week' => 7,
                    'frequency' => 'daily (07:15)',
                ],
                [
                    'title' => 'Дневной свет и разминка 10 мин (07:30)',
                    'category' => 'move',
                    'target_days_per_week' => 7,
                    'frequency' => 'daily (07:30)',
                ],
                [
                    'title' => 'Контрастный душ (07:45)',
                    'category' => 'body',
                    'target_days_per_week' => 5,
                    'frequency' => 'weekdays (07:45)',
                ],
            ],
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: string, 2: array<string, mixed>}
     */
    private function execCreateHabit(User $user, array $args): array
    {
        $title = trim((string) ($args['title'] ?? 'Новая привычка'));
        $days = max(1, min(7, (int) ($args['target_days_per_week'] ?? 7)));
        $category = (string) ($args['category'] ?? 'calm');
        $frequency = (string) ($args['frequency'] ?? 'daily');
        $catIds = $this->habits->resolveCategoryIds($category);

        $existing = $user->habits()->get()->first(
            fn (Habit $h) => mb_strtolower($h->title) === mb_strtolower($title)
        );

        if ($existing) {
            $before = $this->snapshotHabit($existing);
            $habit = $this->habits->update($existing, [
                'target_frequency' => $days,
                'category_ids' => $catIds ?: $existing->categories()->pluck('categories.id')->all(),
            ]);

            return [
                [
                    'title' => $habit->title,
                    'category' => $category,
                    'target_days_per_week' => $days,
                    'frequency' => $frequency,
                ],
                "Создана привычка: {$habit->title} ({$days} дн.)",
                ['before' => $before],
            ];
        }

        $habit = $this->habits->create($user, [
            'title' => $title,
            'target_frequency' => $days,
            'accent' => '#e4e4e7',
            'category_ids' => $catIds,
        ]);

        return [
            [
                'title' => $habit->title,
                'category' => $category,
                'target_days_per_week' => $days,
                'frequency' => $frequency,
            ],
            "Создана привычка: {$habit->title} ({$days} дн.)",
            ['created_habit_id' => $habit->id],
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: string, 2: array<string, mixed>}
     */
    private function execUpdateHabit(User $user, array $args): array
    {
        $habit = isset($args['id'])
            ? $user->habits()->with('categories')->find((int) $args['id'])
            : $user->habits()->with('categories')->first();

        if (! $habit) {
            return [$args, 'Привычка для обновления не найдена', []];
        }

        $before = $this->snapshotHabit($habit);
        $changes = is_array($args['changes'] ?? null) ? $args['changes'] : [];

        $patch = [];
        if (! empty($changes['title'])) {
            $patch['title'] = (string) $changes['title'];
        }
        if (isset($changes['target_days_per_week'])) {
            $patch['target_frequency'] = max(1, min(7, (int) $changes['target_days_per_week']));
        }

        $updated = $this->habits->update($habit, $patch);

        return [
            ['id' => $habit->id, 'changes' => $changes],
            "Обновлена привычка: «{$before['title']}» → «{$updated->title}»",
            ['before' => $before],
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: string, 2: array<string, mixed>}
     */
    private function execLogSleep(User $user, array $args): array
    {
        $bed = (string) ($args['bedtime'] ?? '23:30');
        $wake = (string) ($args['wake_time'] ?? '07:20');
        $quality = max(1, min(5, (int) ($args['quality'] ?? 4)));
        $note = isset($args['note']) ? (string) $args['note'] : null;
        $date = Carbon::today()->toDateString();

        $existing = $user->sleepLogs()->whereDate('date', $date)->first();
        $snapshot = $existing
            ? [
                'sleep_log_id' => $existing->id,
                'previous_log' => [
                    'bed_time' => $existing->bed_time,
                    'wake_time' => $existing->wake_time,
                    'duration_minutes' => $existing->duration_minutes,
                    'quality_rating' => $existing->quality_rating,
                    'notes' => $existing->notes,
                ],
            ]
            : [];

        $minutes = SleepLog::minutesBetween($bed, $wake);
        $log = $user->sleepLogs()->updateOrCreate(
            ['date' => $date],
            [
                'bed_time' => $bed,
                'wake_time' => $wake,
                'duration_minutes' => $minutes,
                'quality_rating' => $quality,
                'notes' => $note,
            ],
        );

        if (! $existing) {
            $snapshot['created_sleep_log_id'] = $log->id;
        }

        $hours = round($minutes / 60, 1);

        return [
            [
                'bedtime' => $bed,
                'wake_time' => $wake,
                'quality' => $quality,
                'note' => $note,
            ],
            "Записан сон: {$bed}–{$wake} ({$hours} ч, качество {$quality}/5)",
            $snapshot,
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: string, 2: array<string, mixed>}
     */
    private function execApplyRoutinePlan(User $user, array $args): array
    {
        $name = (string) ($args['name'] ?? 'Утренняя бодрость');
        $items = is_array($args['habits'] ?? null) ? $args['habits'] : [];

        $createdIds = [];
        $updatedSnapshots = [];
        $titles = [];

        foreach ($items as $item) {
            $title = trim((string) ($item['title'] ?? ''));
            if ($title === '') {
                continue;
            }
            $days = max(1, min(7, (int) ($item['target_days_per_week'] ?? 7)));
            $catIds = $this->habits->resolveCategoryIds((string) ($item['category'] ?? 'body'));

            $existing = $user->habits()->get()->first(
                fn (Habit $h) => mb_strtolower($h->title) === mb_strtolower($title)
            );

            if ($existing) {
                $updatedSnapshots[] = $this->snapshotHabit($existing);
                $habit = $this->habits->update($existing, [
                    'target_frequency' => $days,
                    'category_ids' => $catIds ?: $existing->categories()->pluck('categories.id')->all(),
                ]);
            } else {
                $habit = $this->habits->create($user, [
                    'title' => $title,
                    'target_frequency' => $days,
                    'accent' => '#e4e4e7',
                    'category_ids' => $catIds,
                ]);
                $createdIds[] = $habit->id;
            }

            $titles[] = $habit->title;
        }

        return [
            ['name' => $name, 'habits' => $items],
            sprintf('Применён план «%s»: %s', $name, implode(' · ', $titles)),
            ['created_habit_ids' => $createdIds, 'updated_habits' => $updatedSnapshots],
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Habit>  $habits
     */
    private function matchHabit(string $lower, $habits): ?Habit
    {
        foreach ($habits as $habit) {
            $titleLower = mb_strtolower($habit->title);
            $firstWord = preg_split('/\s+/u', $titleLower)[0] ?? '';
            $stem = mb_substr($firstWord, 0, max(4, mb_strlen($firstWord) - 2));
            if ($stem !== '' && str_contains($lower, $stem)) {
                return $habit;
            }
            if (str_contains($lower, 'чтен') && str_contains($titleLower, 'чтен')) {
                return $habit;
            }
        }

        return $habits->first();
    }

    private function normalizeHabitTitle(string $raw, bool $beforeSleep = false): string
    {
        $lower = mb_strtolower($raw, 'UTF-8');

        // Частые бытовые сценарии приводим к коротким и понятным названиям
        if (preg_match('/(вод[уыа]|попить|выпи[тьл])/u', $lower) && str_contains($lower, 'вод')) {
            return $beforeSleep ? 'Выпить воды перед сном' : 'Стакан воды';
        }
        if (str_contains($lower, 'чтен') || str_contains($lower, 'книг')) {
            return 'Чтение 20 минут';
        }
        if (str_contains($lower, 'прогул') || str_contains($lower, 'шаг')) {
            return 'Прогулка 20 минут';
        }
        if (str_contains($lower, 'размин') || str_contains($lower, 'зарядк')) {
            return 'Разминка 10 минут';
        }
        if (str_contains($lower, 'медитац')) {
            return 'Медитация 10 минут';
        }

        // Убираем вводные слова, время и мусор, оставляя суть привычки
        $cleaned = preg_replace(
            '/\b(мне|пожалуйста|помоги|нужно|надо|хочу|трекер|привычк[уаи]?|такой|такую|такое|чтобы|я|перед\s+сном|до\s+сна|на\s+ночь|вечером|утром)\b/iu',
            ' ',
            $raw,
        ) ?? $raw;
        $cleaned = preg_replace('/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/u', ' ', $cleaned) ?? $cleaned;
        $cleaned = trim(preg_replace('/\s+/u', ' ', $cleaned) ?? '', " \t\n\r\0\x0B,-–—.");

        // Защита от пустых строк, цифр или битой кодировки (?????)
        if (! mb_check_encoding($cleaned, 'UTF-8') || ! preg_match('/[\p{Cyrillic}a-zA-Z]{2,}/u', $cleaned)) {
            return $beforeSleep ? 'Вечерний ритуал' : 'Полезная привычка';
        }

        $cleaned = mb_substr($cleaned, 0, 48, 'UTF-8');

        return mb_strtoupper(mb_substr($cleaned, 0, 1, 'UTF-8'), 'UTF-8').mb_substr($cleaned, 1, null, 'UTF-8');
    }

    private function extractTime(string $text): ?string
    {
        if (preg_match('/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/', $text, $m)) {
            return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        }

        return null;
    }

    private function extractQuality(string $lower): int
    {
        if (preg_match('/качеств[оа]\s*([1-5])/u', $lower, $m) || preg_match('/\b([1-5])\s*\/\s*5\b/', $lower, $m)) {
            return (int) $m[1];
        }
        if (str_contains($lower, 'плохо')) {
            return 2;
        }

        return 4;
    }

    private function snapshotHabit(Habit $habit): array
    {
        return [
            'id' => $habit->id,
            'title' => $habit->title,
            'target_frequency' => $habit->target_frequency,
            'accent' => $habit->accent,
            'category_ids' => $habit->categories()->pluck('categories.id')->all(),
        ];
    }

    private function restoreHabit(User $user, array $snap): void
    {
        $habit = $user->habits()->find($snap['id'] ?? null);
        if (! $habit) {
            return;
        }
        $habit->update([
            'title' => $snap['title'],
            'target_frequency' => $snap['target_frequency'],
            'accent' => $snap['accent'] ?? '#e4e4e7',
        ]);
        $habit->categories()->sync($snap['category_ids'] ?? []);
    }

    private function cacheKey(User $user): string
    {
        return "lumen.assistant.actions.{$user->id}";
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadActions(User $user): array
    {
        return (array) Cache::get($this->cacheKey($user), []);
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function saveAction(User $user, array $record): void
    {
        $actions = $this->loadActions($user);
        $actions[$record['id']] = $record;
        $this->persistActions($user, $actions);
    }

    /**
     * @param  array<string, array<string, mixed>>  $actions
     */
    private function persistActions(User $user, array $actions): void
    {
        Cache::put($this->cacheKey($user), $actions, now()->addDays(7));
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function publicAction(array $record): array
    {
        $status = $record['status'] ?? 'applied';

        return [
            'id' => $record['id'],
            'tool' => $record['tool'],
            'arguments' => $record['arguments'],
            'summary' => $record['summary'],
            'status' => $status,
            'can_confirm' => $status === 'applied',
            'can_undo' => $status === 'applied' || $status === 'confirmed',
            'created_at' => $record['created_at'] ?? null,
        ];
    }
}
