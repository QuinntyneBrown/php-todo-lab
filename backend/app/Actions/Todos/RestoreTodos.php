<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Models\Todo;
use App\Repositories\TodoRepository;
use Illuminate\Support\Collection;

final readonly class RestoreTodos
{
    public function __construct(private TodoRepository $todos) {}

    /**
     * Restores the soft-deleted todos among `$ids` in one transaction; others are ignored.
     *
     * @param  list<string>  $ids
     * @return Collection<int, Todo>
     */
    public function handle(array $ids): Collection
    {
        return $this->todos->restoreMany($ids);
    }
}
