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

class SleepController extends Controller
{
    public function __construct(private readonly SleepAnalyticsService $analytics) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = $request->user()
            ->sleepLogs()
            ->orderByDesc('date')
            ->limit(60)
            ->get();

        return SleepLogResource::collection($logs);
    }

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

    public function show(SleepLog $sleep): SleepLogResource
    {
        Gate::authorize('view', $sleep);

        return new SleepLogResource($sleep);
    }

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

    public function destroy(SleepLog $sleep): JsonResponse
    {
        Gate::authorize('delete', $sleep);

        $sleep->delete();

        return response()->json(status: 204);
    }

    public function stats(Request $request): JsonResponse
    {
        return response()->json($this->analytics->getWeeklySummary($request->user()->id));
    }
}
