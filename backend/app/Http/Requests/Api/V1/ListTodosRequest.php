<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use App\Enums\TodoStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListTodosRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::enum(TodoStatus::class)],
        ];
    }

    public function status(): TodoStatus
    {
        return $this->enum('status', TodoStatus::class) ?? TodoStatus::All;
    }
}
