<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AiAdvisorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avg_sleep_hours' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'avg_sleep_quality' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'habit_completion_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'question' => ['nullable', 'string', 'max:1000'],
            'history' => ['sometimes', 'array', 'max:12'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.text' => ['required_with:history', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avg_sleep_hours.max' => 'Среднее время сна не может превышать 24 часа.',
            'avg_sleep_quality.between' => 'Качество сна указывается по шкале от 1 до 5.',
            'habit_completion_percent.max' => 'Процент выполнения привычек — от 0 до 100.',
            'question.max' => 'Вопрос слишком длинный (максимум 1000 символов).',
        ];
    }
}
