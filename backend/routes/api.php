<?php

use App\Http\Controllers\Api\ActivityMatrixController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\AiAdviceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\HabitController;
use App\Http\Controllers\Api\SleepController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/demo', [AuthController::class, 'demo']);

// Authenticated (Sanctum bearer token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/categories', [CategoryController::class, 'index']);

    Route::apiResource('habits', HabitController::class);
    Route::post('habits/{habit}/toggle', [HabitController::class, 'toggle']);

    Route::get('sleep/stats', [SleepController::class, 'stats']);
    Route::apiResource('sleep', SleepController::class);

    Route::get('matrix', [ActivityMatrixController::class, 'index']);

    Route::get('ai/advice', [AiAdviceController::class, 'show'])->middleware('throttle:20,1');
    Route::post('ai/advisor', [AiAdviceController::class, 'advisor'])->middleware('throttle:20,1');

    // Admin only
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::apiResource('categories', AdminCategoryController::class);
    });
});
