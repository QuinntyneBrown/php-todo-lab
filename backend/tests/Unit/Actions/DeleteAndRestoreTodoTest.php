<?php

/**
 * Traces to: L2-015
 */

declare(strict_types=1);

use App\Actions\Todos\DeleteTodo;
use App\Actions\Todos\RestoreTodo;
use App\Enums\TodoStatus;
use App\Exceptions\TodoNotFound;
use Tests\Fakes\InMemoryTodoRepository;

beforeEach(function (): void {
    $this->repository = new InMemoryTodoRepository;
});

it('deletes a todo so it leaves the list', function (): void {
    $todo = $this->repository->seed(title: 'Call mom');

    (new DeleteTodo($this->repository))->handle($todo->id);

    expect($this->repository->list(TodoStatus::All))->toBeEmpty();
});

it('refuses to delete an unknown todo', function (): void {
    (new DeleteTodo($this->repository))->handle('01jz0000000000000000000000');
})->throws(TodoNotFound::class);

it('restores a deleted todo with its completion', function (): void {
    $todo = $this->repository->seed(title: 'Call mom', completed: true, deleted: true);

    $restored = (new RestoreTodo($this->repository))->handle($todo->id);

    expect($restored->completed)->toBeTrue()
        ->and($this->repository->list(TodoStatus::All)->pluck('id')->all())->toBe([$todo->id]);
});

it('refuses to restore a todo that is not deleted', function (): void {
    $todo = $this->repository->seed(title: 'Call mom');

    (new RestoreTodo($this->repository))->handle($todo->id);
})->throws(TodoNotFound::class);
