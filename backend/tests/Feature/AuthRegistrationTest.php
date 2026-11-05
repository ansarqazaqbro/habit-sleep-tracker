<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_a_working_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'secret-pass-123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role', 'user');

        $this->assertDatabaseHas('users', ['email' => 'test@example.com', 'role' => 'user']);
        $this->assertNotEmpty($response->json('token'));

        // The issued token must authenticate against a protected endpoint.
        $this->withHeader('Authorization', 'Bearer '.$response->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'test@example.com');

        $this->assertSame(1, User::count());
    }

    public function test_protected_endpoints_reject_guests(): void
    {
        $this->getJson('/api/habits')->assertUnauthorized();
    }
}
