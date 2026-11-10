<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiAdvisorRequest;
use App\Services\AiPlanService;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAdviceController extends Controller
{
    public function __construct(
        private readonly AiService $ai,
        private readonly AiPlanService $planner,
    ) {}

    /**
     * GET /api/ai/advice — краткая сводка для карточки на дашборде сна.
     * Strictly returns {"summary": "...", "recommendation": "...", "score": 85}.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->ai->generateAdvice($request->user()));
    }

    /**
     * POST /api/ai/advisor — персональный AI-консультант Lumen (Lumen Assistant).
     * Мгновенно выполняет агентные инструменты (create_habit, update_habit,
     * log_sleep, apply_routine_plan) и возвращает аналитический разбор без зависаний.
     */
    public function advisor(AiAdvisorRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $question = $data['question'] ?? $request->input('message');

        $context = $this->ai->buildContext($user);
        $planResult = $this->planner->executeIfApplicable($user, $question, $context);

        // Пересчитываем контекст после выполнения инструментов, чтобы цифры были актуальными
        if ($planResult['executed']) {
            $context = $this->ai->buildContext($user);
        }

        $result = $this->ai->advise(
            user: $user,
            stats: [
                'avg_sleep_hours' => $data['avg_sleep_hours'] ?? null,
                'avg_sleep_quality' => $data['avg_sleep_quality'] ?? null,
                'habit_completion_percent' => $data['habit_completion_percent'] ?? null,
            ],
            question: $question,
            history: $data['history'] ?? [],
        );

        if ($planResult['executed']) {
            $result['reply'] = $planResult['reply'];
            $result['actions'] = $planResult['actions'];
        } else {
            $result['actions'] = [];
        }

        $result['recent_actions'] = $this->planner->recentActions($user);

        return response()->json($result);
    }

    public function confirmAction(Request $request, string $action): JsonResponse
    {
        $updated = $this->planner->confirm($request->user(), $action);
        abort_if($updated === null, 404, 'Действие не найдено.');

        return response()->json(['data' => $updated]);
    }

    public function undoAction(Request $request, string $action): JsonResponse
    {
        $updated = $this->planner->undo($request->user(), $action);
        abort_if($updated === null, 404, 'Действие не найдено.');

        return response()->json(['data' => $updated]);
    }
}
