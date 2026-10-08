<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Exceptions\TodoNotFound;
use App\Repositories\TodoRepository;

final readonly class DeleteTodo
{
    public function __construct(private TodoRepository $todos) {}

    /**
     * Soft-deletes the todo so it can be restored until it is purged (L2-015, L2-016).
     *
     * @throws TodoNotFound
     */
    public function handle(string $id): void
    {
        $this->todos->delete($this->todos->find($id) ?? throw new TodoNotFound($id));
    }
}
