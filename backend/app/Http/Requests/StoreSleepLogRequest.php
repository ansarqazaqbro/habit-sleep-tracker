<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSleepLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'bed_time' => [$required, 'date_format:H:i'],
            'wake_time' => [$required, 'date_format:H:i'],
            'quality_rating' => [$required, 'integer', 'between:1,5'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'quality_rating.between' => 'Оценка качества сна должна быть от 1 до 5.',
        ];
    }
}
