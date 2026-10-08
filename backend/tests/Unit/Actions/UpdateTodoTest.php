<?php

/**
 * Traces to: L2-009, L2-014
 */

declare(strict_types=1);

use App\Actions\Todos\UpdateTodo;
use App\Exceptions\TodoNotFound;
use Tests\Fakes\InMemoryTodoRepository;

beforeEach(function (): void {
    $this->repository = new InMemoryTodoRepository;
    $this->action = new UpdateTodo($this->repository);
});

it('completes and reopens a todo', function (): void {
    $todo = $this->repository->seed(title: 'Call mom');

    expect($this->action->handle($todo->id, ['completed' => true])->completed)->toBeTrue()
        ->and($this->action->handle($todo->id, ['completed' => false])->completed_at)->toBeNull();
});

it('keeps completedAt when completing twice', function (): void {
    $todo = $this->repository->seed(title: 'Call mom', completed: true);
    $completedAt = $todo->completed_at;

    expect($this->action->handle($todo->id, ['completed' => true])->completed_at)->toEqual($completedAt);
});

it('renames a todo without touching completion', function (): void {
    $todo = $this->repository->seed(title: 'Call mom', completed: true);

    $updated = $this->action->handle($todo->id, ['title' => 'Call mom Sunday']);

    expect($updated->title)->toBe('Call mom Sunday')->and($updated->completed)->toBeTrue();
});

it('throws TodoNotFound for an unknown or deleted id', function (): void {
    $deleted = $this->repository->seed(title: 'Gone', deleted: true);

    expect(fn () => $this->action->handle('01jz0000000000000000000000', ['completed' => true]))
        ->toThrow(TodoNotFound::class)
        ->and(fn () => $this->action->handle($deleted->id, ['completed' => true]))
        ->toThrow(TodoNotFound::class);
});
