<?php

declare(strict_types=1);

namespace Tests\Fakes;

use App\Enums\TodoStatus;
use App\Exceptions\TodoLimitReached;
use App\Models\Todo;
use App\Repositories\TodoRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/** A database-free TodoRepository for unit tests of the Actions (L2-044 criterion 3). */
final class InMemoryTodoRepository implements TodoRepository
{
    /** @var array<string, Todo> */
    private array $rows = [];

    private CarbonImmutable $clock;

    public function __construct()
    {
        $this->clock = CarbonImmutable::parse('2026-01-01T00:00:00Z');
    }

    /** Adds a todo created one second after the previous one. */
    public function seed(string $title, bool $completed = false, bool $deleted = false): Todo
    {
        $this->clock = $this->clock->addSecond();

        $todo = new Todo;
        $todo->id = Str::lower((string) Str::ulid());
        $todo->title = $title;
        $todo->completed_at = $completed ? $this->clock : null;
        $todo->created_at = $this->clock;
        $todo->updated_at = $this->clock;
        $todo->deleted_at = $deleted ? $this->clock : null;

        return $this->rows[$todo->id] = $todo;
    }

    public function list(TodoStatus $status): Collection
    {
        return $this->live()
            ->filter(fn (Todo $todo): bool => match ($status) {
                TodoStatus::All => true,
                TodoStatus::Active => ! $todo->completed,
                TodoStatus::Completed => $todo->completed,
            })
            ->sortBy([
                fn (Todo $a, Todo $b): int => $b->created_at <=> $a->created_at,
                fn (Todo $a, Todo $b): int => strcmp($b->id, $a->id),
            ])
            ->values();
    }

    public function counts(): array
    {
        $live = $this->live();

        return [
            'active' => $live->reject(fn (Todo $todo): bool => $todo->completed)->count(),
            'completed' => $live->filter(fn (Todo $todo): bool => $todo->completed)->count(),
        ];
    }

    public function createWithinLimit(string $title, int $limit): Todo
    {
        if ($this->live()->count() >= $limit) {
            throw new TodoLimitReached($limit);
        }

        return $this->seed($title);
    }

    public function find(string $id): ?Todo
    {
        return $this->live()->get($id);
    }

    public function update(Todo $todo, array $columns): Todo
    {
        foreach ($columns as $column => $value) {
            $todo->setAttribute($column, $value);
        }

        return $todo;
    }

    public function delete(Todo $todo): void
    {
        $todo->deleted_at = CarbonImmutable::now();
    }

    public function findDeleted(string $id): ?Todo
    {
        $todo = $this->rows[$id] ?? null;

        return $todo?->deleted_at === null ? null : $todo;
    }

    public function restore(Todo $todo): Todo
    {
        $todo->deleted_at = null;

        return $todo;
    }

    /**
     * @return Collection<string, Todo>
     */
    private function live(): Collection
    {
        return collect($this->rows)->filter(fn (Todo $todo): bool => $todo->deleted_at === null);
    }
}
