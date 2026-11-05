<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->unsignedTinyInteger('target_frequency')->default(7); // target days per week
            $table->unsignedInteger('streak_count')->default(0);
            $table->unsignedInteger('best_streak')->default(0);
            $table->string('accent', 20)->default('#34d399');
            $table->string('icon', 40)->nullable();
            $table->timestamps();
        });

        Schema::create('category_habit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['habit_id', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_habit');
        Schema::dropIfExists('habits');
    }
};
