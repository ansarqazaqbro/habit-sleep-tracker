<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabitRequest;
use App\Http\Requests\ToggleHabitRequest;
use App\Http\Resources\HabitResource;
use App\Models\Habit;
use App\Services\HabitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class HabitController extends Controller
{
    public function __construct(private readonly HabitService $habits) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return HabitResource::collection($this->habits->listFor($request->user()));
    }

    public function store(StoreHabitRequest $request): HabitResource
    {
        $habit = $this->habits->create($request->user(), $request->validated());

        return new HabitResource($habit);
    }

    public function show(Habit $habit): HabitResource
    {
        Gate::authorize('view', $habit);

        return new HabitResource($habit->load('categories'));
    }

    public function update(StoreHabitRequest $request, Habit $habit): HabitResource
    {
        Gate::authorize('update', $habit);

        return new HabitResource($this->habits->update($habit, $request->validated()));
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

        return new HabitResource($this->habits->toggle($habit, $request->validated('date')));
    }
}
