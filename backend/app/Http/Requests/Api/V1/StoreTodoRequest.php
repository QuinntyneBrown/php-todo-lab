<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A title is 1 to 200 characters after trimming (L2-002). The global TrimStrings
 * and ConvertEmptyStringsToNull middleware trim it first, and `max` counts characters.
 */
final class StoreTodoRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
        ];
    }

    public function title(): string
    {
        return $this->string('title')->toString();
    }
}
