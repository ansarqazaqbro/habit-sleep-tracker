<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHabitRequest extends FormRequest
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
            'title' => [$required, 'string', 'max:120'],
            'target_frequency' => ['sometimes', 'integer', 'min:1', 'max:7'],
            'accent' => ['sometimes', 'string', 'max:20'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:40'],
            'category_ids' => ['sometimes', 'array', 'max:10'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Укажите название привычки.',
            'category_ids.*.exists' => 'Выбранной категории не существует.',
        ];
    }
}
