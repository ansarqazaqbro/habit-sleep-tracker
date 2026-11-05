<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
        ]);

        // `role` is not mass assignable, so every self-registered account is a plain "user".
        $user = User::create($data)->refresh();

        return response()->json($this->tokenPayload($user), 201);
    }

    public function demo(): JsonResponse
    {
        $user = User::query()->firstOrCreate(
            ['email' => 'demo@habit.local'],
            [
                'name' => 'Aurora',
                'password' => Hash::make('password'),
            ],
        );

        $user->tokens()->where('name', 'spa')->delete();

        return response()->json($this->tokenPayload($user));
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Неверный email или пароль'], 422);
        }

        return response()->json($this->tokenPayload($user));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->present($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(status: 204);
    }

    /**
     * @return array{token: string, user: array<string, mixed>}
     */
    private function tokenPayload(User $user): array
    {
        return [
            'token' => $user->createToken('spa')->plainTextToken,
            'user' => $this->present($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}
