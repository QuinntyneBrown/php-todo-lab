<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class RestoreTodosRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'list', 'min:1', 'max:500'],
            'ids.*' => ['required', 'string', 'ulid', 'distinct'],
        ];
    }

    /**
     * @return list<string>
     */
    public function ids(): array
    {
        return array_values(array_map(strtolower(...), $this->array('ids')));
    }
}
