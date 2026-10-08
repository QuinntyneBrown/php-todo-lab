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
        if (array_key_exists('completed', $changes) && $changes['completed'] !== $todo->completed) {
            $columns['completed_at'] = $changes['completed'] ? now() : null;
        }

        return $this->todos->update($todo, $columns);
    }
}
