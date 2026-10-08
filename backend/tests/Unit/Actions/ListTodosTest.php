<?php

/**
 * Traces to: L2-005, L2-006
 */

declare(strict_types=1);

use App\Actions\Todos\ListTodos;
use App\Enums\TodoStatus;
use Tests\Fakes\InMemoryTodoRepository;

beforeEach(function (): void {
    $this->repository = new InMemoryTodoRepository;
    $this->repository->seed(title: 'A');
    $this->repository->seed(title: 'B', completed: true);
    $this->repository->seed(title: 'C');
    $this->repository->seed(title: 'Gone', deleted: true);
    $this->action = new ListTodos($this->repository);
});

it('lists every non-deleted todo newest first with counts', function (): void {
    $result = $this->action->handle(TodoStatus::All);

    expect($result->todos->pluck('title')->all())->toBe(['C', 'B', 'A'])
        ->and($result->active)->toBe(2)
        ->and($result->completed)->toBe(1);
});

it('narrows the todos but not the counts by status', function (TodoStatus $status, array $titles): void {
    $result = $this->action->handle($status);

    expect($result->todos->pluck('title')->all())->toBe($titles)
        ->and($result->active)->toBe(2)
        ->and($result->completed)->toBe(1);
})->with([
    'active' => [TodoStatus::Active, ['C', 'A']],
    'completed' => [TodoStatus::Completed, ['B']],
]);
