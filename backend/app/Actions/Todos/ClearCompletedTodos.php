<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Repositories\TodoRepository;

final readonly class ClearCompletedTodos
{
    public function __construct(private TodoRepository $todos) {}

    /**
     * Soft-deletes every completed todo in one transaction (L2-017, L2-043).
     *
     * @return list<string> the ids deleted, so the client can undo
     */
    public function handle(): array
    {
        return $this->todos->deleteCompleted();
    }
}
