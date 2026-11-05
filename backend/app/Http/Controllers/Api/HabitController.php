<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabitRequest;
use App\Http\Requests\ToggleHabitRequest;
use App\Http\Resources\HabitResource;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Services\StreakService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class HabitController extends Controller
{
    public function __construct(private readonly StreakService $streaks) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $today = now()->toDateString();

        $habits = $request->user()
            ->habits()
            ->with('categories')
            ->withExists([
                'logs as completed_today' => fn ($query) => $query
                    ->whereDate('completed_at', $today)
                    ->where('status', HabitLog::STATUS_COMPLETED),
            ])
            ->orderBy('id')
            ->get();

        return HabitResource::collection($habits);
    }

    public function store(StoreHabitRequest $request): HabitResource
    {
        $data = $request->validated();
        $categoryIds = $data['category_ids'] ?? [];
        unset($data['category_ids']);

        $habit = DB::transaction(function () use ($request, $data, $categoryIds) {
            $habit = $request->user()->habits()->create($data);
            $habit->categories()->sync($categoryIds);

            return $habit;
        });

        return new HabitResource($habit->refresh()->load('categories'));
    }

    public function show(Habit $habit): HabitResource
    {
        Gate::authorize('view', $habit);

        return new HabitResource($habit->load('categories'));
    }

    public function update(StoreHabitRequest $request, Habit $habit): HabitResource
    {
        Gate::authorize('update', $habit);

        $data = $request->validated();
        $categoryIds = $data['category_ids'] ?? null;
        unset($data['category_ids']);

        DB::transaction(function () use ($habit, $data, $categoryIds) {
            $habit->update($data);

            if ($categoryIds !== null) {
                $habit->categories()->sync($categoryIds);
            }
        });

        return new HabitResource($habit->refresh()->load('categories'));
    }

    public function destroy(Habit $habit): JsonResponse
    {
        Gate::authorize('delete', $habit);

        $habit->delete();

        return response()->json(status: 204);
    }

    public function toggle(ToggleHabitRequest $request, Habit $habit): HabitResource
    {
        Gate::authorize('toggle', $habit);

        $this->streaks->toggle($habit, $request->validated('date'));

        return new HabitResource($habit->refresh()->load('categories'));
    }
}
