<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\TodoStatus;
use App\Exceptions\TodoLimitReached;
use App\Models\Todo;
use Carbon\CarbonImmutable;
use DateTimeInterface;
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

    /**
     * Creates a todo unless `$limit` non-deleted todos already exist. The check and the
     * insert are atomic, so concurrent creates cannot exceed the limit (L2-043).
     *
     * @throws TodoLimitReached
     */
    public function createWithinLimit(string $title, int $limit): Todo;

    /** The non-deleted todo with this id, if any. */
    public function find(string $id): ?Todo;

    /**
     * Writes the given columns in one statement and returns the updated todo.
     *
     * @param  array{title?: string, completed_at?: DateTimeInterface|null}  $columns
     */
    public function update(Todo $todo, array $columns): Todo;

    /** Soft-deletes the todo. */
    public function delete(Todo $todo): void;

    /** The soft-deleted todo with this id, if it has not been purged. */
    public function findDeleted(string $id): ?Todo;

    public function restore(Todo $todo): Todo;

    /**
     * Soft-deletes every completed todo in one transaction.
     *
     * @return list<string> the ids deleted
     */
    public function deleteCompleted(): array;

    /**
     * Restores the soft-deleted todos among `$ids` in one transaction.
     *
     * @param  list<string>  $ids
     * @return Collection<int, Todo> the restored todos
     */
    public function restoreMany(array $ids): Collection;

    /**
     * Permanently deletes up to `$limit` todos soft-deleted strictly before `$cutoff`.
     *
     * @return int the number of todos purged
     */
    public function purgeDeletedBefore(CarbonImmutable $cutoff, int $limit): int;
}
