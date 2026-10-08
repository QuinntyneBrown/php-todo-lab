<?php

/**
 * Traces to: L2-015, L2-018
 */

declare(strict_types=1);

use App\Models\Todo;

it('soft-deletes a todo and returns 204', function (): void {
    $todo = Todo::factory()->create();

    $this->deleteJson("/api/v1/todos/{$todo->id}")->assertNoContent();

    expect(Todo::query()->find($todo->id))->toBeNull()
        ->and(Todo::withTrashed()->find($todo->id)?->deleted_at)->not->toBeNull();
    $this->getJson('/api/v1/todos')->assertJsonCount(0, 'data');
});

it('returns 404 problem details when deleting an unknown or deleted todo', function (string $kind): void {
    $id = match ($kind) {
        'unknown' => '01jz0000000000000000000000',
        'deleted' => tap(Todo::factory()->create())->delete()->id,
    };

    $this->deleteJson("/api/v1/todos/{$id}")
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json');
})->with(['unknown', 'deleted']);
