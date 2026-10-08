<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Exceptions\TodoNotFound;
use App\Models\Todo;
use App\Repositories\TodoRepository;

final readonly class UpdateTodo
{
    public function __construct(private TodoRepository $todos) {}

    /**
     * Applies a partial update. Completing an already completed todo keeps its
     * original completedAt, so the operation is idempotent (L2-009).
     *
     * @param  array{title?: string, completed?: bool}  $changes
     *
     * @throws TodoNotFound
     */
    public function handle(string $id, array $changes): Todo
    {
        $todo = $this->todos->find($id) ?? throw new TodoNotFound($id);

        $columns = [];
        if (array_key_exists('title', $changes)) {
            $columns['title'] = $changes['title'];
        }
        // Always written when requested, so a concurrent request cannot leave this
        // one half-applied (L2-043); `??` keeps an existing completedAt (L2-009).
        if (array_key_exists('completed', $changes)) {
            $columns['completed_at'] = $changes['completed'] ? ($todo->completed_at ?? now()) : null;
        }

        return $this->todos->update($todo, $columns);
    }
}
