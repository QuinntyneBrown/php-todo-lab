<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\TodoStatus;
use App\Models\Todo;
use Illuminate\Support\Collection;

interface TodoRepository
{
    /**
     * Non-deleted todos matching the status, newest first, ties broken by id descending.
     *
     * @return Collection<int, Todo>
     */
    public function list(TodoStatus $status): Collection;

    /**
     * Counts of all non-deleted todos.
     *
     * @return array{active: int, completed: int}
     */
    public function counts(): array;
}
