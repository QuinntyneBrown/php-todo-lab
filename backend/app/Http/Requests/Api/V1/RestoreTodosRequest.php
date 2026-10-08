<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class RestoreTodosRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'list', 'min:1', 'max:500', $this->distinct(...)],
            'ids.*' => ['required', 'string', 'ulid'],
        ];
    }

    /**
     * One pass over the list; the per-item `distinct` rule compares every pair, which
     * costs too much at 500 ids (L2-038).
     */
    private function distinct(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_array($value) && count($value) !== count(array_unique(array_map(
            fn (mixed $id): mixed => is_string($id) ? strtolower($id) : $id,
            $value,
        ), SORT_REGULAR))) {
            $fail('The :attribute field must not contain duplicates.');
        }
    }

    /**
     * @return list<string>
     */
    public function ids(): array
    {
        return array_values(array_map(strtolower(...), $this->array('ids')));
    }
}
