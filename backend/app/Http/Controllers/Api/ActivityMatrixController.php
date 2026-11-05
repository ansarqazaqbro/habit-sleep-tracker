<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityMatrixResource;
use App\Services\ActivityMatrixService;
use Illuminate\Http\Request;

class ActivityMatrixController extends Controller
{
    public function __construct(private readonly ActivityMatrixService $matrix) {}

    public function index(Request $request): ActivityMatrixResource
    {
        return new ActivityMatrixResource(
            $this->matrix->build($request->user(), (int) $request->integer('weeks', 16)),
        );
    }
}
