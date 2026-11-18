<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSleepLogRequest;
use App\Http\Resources\SleepLogResource;
use App\Models\SleepLog;
use App\Services\SleepAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * REST-контроллер для логирования сна и получения недельной аналитики.
 */
class SleepController extends Controller
{
    public function __construct(private readonly SleepAnalyticsService $analytics) {}

    /**
     * Возвращает последние 60 записей сна пользователя в порядке убывания даты.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = $request->user()
            ->sleepLogs()
            ->orderByDesc('date')
            ->limit(60)
            ->get();

        return SleepLogResource::collection($logs);
    }

    /**
     * Создаёт или обновляет запись сна за указанную дату (по умолчанию — за сегодня).
     */
    public function store(StoreSleepLogRequest $request): SleepLogResource
    {
        $data = $request->validated();
        $date = $data['date'] ?? now()->toDateString();

        $log = $request->user()->sleepLogs()->updateOrCreate(
            ['date' => $date],
            [
                'bed_time' => $data['bed_time'],
                'wake_time' => $data['wake_time'],
                'duration_minutes' => SleepLog::minutesBetween($data['bed_time'], $data['wake_time']),
                'quality_rating' => $data['quality_rating'],
                'notes' => $data['notes'] ?? null,
            ],
        );

        return new SleepLogResource($log->refresh());
    }

    /**
     * Возвращает конкретную запись сна.
     */
    public function show(SleepLog $sleep): SleepLogResource
    {
        Gate::authorize('view', $sleep);

        return new SleepLogResource($sleep);
    }

    /**
     * Обновляет запись сна и пересчитывает длительность в минутах.
     */
    public function update(StoreSleepLogRequest $request, SleepLog $sleep): SleepLogResource
    {
        Gate::authorize('update', $sleep);

        $data = $request->validated();

        $bed = $data['bed_time'] ?? substr((string) $sleep->bed_time, 0, 5);
        $wake = $data['wake_time'] ?? substr((string) $sleep->wake_time, 0, 5);
        $data['duration_minutes'] = SleepLog::minutesBetween($bed, $wake);

        $sleep->update($data);

        return new SleepLogResource($sleep->refresh());
    }

    /**
     * Удаляет запись сна.
     */
    public function destroy(SleepLog $sleep): JsonResponse
    {
        Gate::authorize('delete', $sleep);

        $sleep->delete();

        return response()->json(status: 204);
    }

    /**
     * Возвращает сводную статистику сна за последние 7 дней.
     */
    public function stats(Request $request): JsonResponse
    {
        return response()->json($this->analytics->getWeeklySummary($request->user()->id));
    }
}
