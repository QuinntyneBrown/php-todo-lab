<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\TodoStatus;
use App\Models\Todo;
use Illuminate\Support\Collection;

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
}
