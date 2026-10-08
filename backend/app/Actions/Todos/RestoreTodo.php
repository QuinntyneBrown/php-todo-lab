<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Exceptions\TodoNotFound;
use App\Models\Todo;
use App\Repositories\TodoRepository;

final readonly class RestoreTodo
{
    public function __construct(private TodoRepository $todos) {}

    /**
     * Brings back a soft-deleted todo unchanged, so it returns to its place (L2-015).
     *
     * @throws TodoNotFound
     */
    public function handle(string $id): Todo
    {
        return $this->todos->restore($this->todos->findDeleted($id) ?? throw new TodoNotFound($id));
    }
}
