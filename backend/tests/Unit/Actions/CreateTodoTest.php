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
