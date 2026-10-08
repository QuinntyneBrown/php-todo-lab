<?php

/**
 * Traces to: L2-001
 */

declare(strict_types=1);

use App\Actions\Todos\CreateTodo;
use App\Enums\TodoStatus;
use Tests\Fakes\InMemoryTodoRepository;

it('creates an active todo', function (): void {
    $repository = new InMemoryTodoRepository;

    $todo = (new CreateTodo($repository))->handle('Buy oat milk');

    expect($todo->title)->toBe('Buy oat milk')
        ->and($todo->completed)->toBeFalse()
        ->and($repository->list(TodoStatus::All)->pluck('id')->all())->toBe([$todo->id]);
});

it('refuses to create beyond the limit', function (): void {
    $repository = new InMemoryTodoRepository;
    foreach (range(1, 500) as $n) {
        $repository->seed(title: "Task {$n}");
    }

    (new CreateTodo($repository))->handle('One more');
})->throws(App\Exceptions\TodoLimitReached::class);
