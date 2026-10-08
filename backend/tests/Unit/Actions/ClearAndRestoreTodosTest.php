<?php

/**
 * Traces to: L2-017
 */

declare(strict_types=1);

use App\Actions\Todos\ClearCompletedTodos;
use App\Actions\Todos\RestoreTodos;
use App\Enums\TodoStatus;
use Tests\Fakes\InMemoryTodoRepository;

it('clears completed todos and restores them by id', function (): void {
    $repository = new InMemoryTodoRepository;
    $done = [
        $repository->seed(title: 'A', completed: true)->id,
        $repository->seed(title: 'B', completed: true)->id,
    ];
    $repository->seed(title: 'C');

    $ids = (new ClearCompletedTodos($repository))->handle();

    expect($ids)->toEqualCanonicalizing($done)
        ->and($repository->list(TodoStatus::All)->pluck('title')->all())->toBe(['C']);

    $restored = (new RestoreTodos($repository))->handle($ids);

    expect($restored->pluck('id')->all())->toEqualCanonicalizing($done)
        ->and($repository->list(TodoStatus::All)->pluck('title')->all())->toBe(['C', 'B', 'A']);
});
