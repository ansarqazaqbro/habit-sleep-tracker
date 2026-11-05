<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiAdvisorRequest;
use App\Services\AiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAdviceController extends Controller
{
    public function __construct(private readonly AiService $ai) {}

    /**
     * GET /api/ai/advice — краткая сводка для карточки на дашборде сна.
     * Strictly returns {"summary": "...", "recommendation": "...", "score": 85}.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->ai->generateAdvice($request->user()));
    }

    /**
     * POST /api/ai/advisor — персональный AI-консультант (Google Gemini).
     * Принимает текущую статистику пользователя (средний сон, качество, % привычек за неделю)
     * и опциональный вопрос / историю чата, возвращает развёрнутые рекомендации и инсайты.
     */
    public function advisor(AiAdvisorRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = $this->ai->advise(
            user: $request->user(),
            stats: [
                'avg_sleep_hours' => $data['avg_sleep_hours'] ?? null,
                'avg_sleep_quality' => $data['avg_sleep_quality'] ?? null,
                'habit_completion_percent' => $data['habit_completion_percent'] ?? null,
            ],
            question: $data['question'] ?? null,
            history: $data['history'] ?? [],
        );

        return response()->json($result);
    }
}
