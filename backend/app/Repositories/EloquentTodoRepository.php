<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\TodoStatus;
use App\Exceptions\TodoLimitReached;
use App\Models\Todo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class EloquentTodoRepository implements TodoRepository
{
    public function list(TodoStatus $status): Collection
    {
        $query = Todo::query()->orderByDesc('created_at')->orderByDesc('id');

        match ($status) {
            TodoStatus::All => null,
            TodoStatus::Active => $query->active(),
            TodoStatus::Completed => $query->completed(),
        };

        return $query->get()->toBase();
    }

    public function counts(): array
    {
        return [
            'active' => Todo::query()->active()->count(),
            'completed' => Todo::query()->completed()->count(),
        ];
    }

    public function createWithinLimit(string $title, int $limit): Todo
    {
        // The locking read takes next-key locks on the scanned index range, so a
        // concurrent create waits here until this transaction commits, then counts
        // the new row. A deadlock is retried by the transaction attempts.
        return DB::transaction(function () use ($title, $limit): Todo {
            if (Todo::query()->lockForUpdate()->count() >= $limit) {
                throw new TodoLimitReached($limit);
            }

            return Todo::query()->create(['title' => $title]);
        }, attempts: 3);
    }

    public function find(string $id): ?Todo
    {
        return Todo::query()->find($id);
    }

    public function update(Todo $todo, array $columns): Todo
    {
        $todo->fill($columns)->save();

        return $todo;
    }
}
