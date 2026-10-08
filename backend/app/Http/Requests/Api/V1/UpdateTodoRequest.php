<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/** A non-empty subset of `title` and `completed`; other fields are ignored (L2-014). */
final class UpdateTodoRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required_without:completed', 'string', 'max:200'],
            'completed' => ['required_without:title', 'boolean:strict'],
        ];
    }

    /**
     * @return array{title?: string, completed?: bool}
     */
    public function changes(): array
    {
        $changes = [];
        if ($this->has('title')) {
            $changes['title'] = $this->string('title')->toString();
        }
        if ($this->has('completed')) {
            $changes['completed'] = $this->boolean('completed');
        }

        return $changes;
    }
}
