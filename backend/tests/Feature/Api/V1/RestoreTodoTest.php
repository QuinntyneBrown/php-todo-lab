<?php

/**
 * Traces to: L2-015, L2-018
 */

declare(strict_types=1);

use App\Models\Todo;

it('restores a deleted todo with its completion intact', function (): void {
    $todo = Todo::factory()->completed()->create(['title' => 'Call mom']);
    $before = $this->getJson('/api/v1/todos')->json('data.0');
    $todo->delete();

    $this->postJson("/api/v1/todos/{$todo->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $todo->id)
        ->assertJsonPath('data.completed', true)
        ->assertJsonPath('data.completedAt', $before['completedAt'])
        ->assertJsonPath('data.createdAt', $before['createdAt']);
});

it('puts a restored todo back in its original position', function (): void {
    foreach (['A', 'B', 'C'] as $i => $title) {
        $this->travelTo(now()->startOfMinute()->addSeconds($i));
        Todo::factory()->create(['title' => $title]);
    }
    $this->travelBack();
    $b = Todo::query()->where('title', 'B')->firstOrFail();

    $this->deleteJson("/api/v1/todos/{$b->id}")->assertNoContent();
    $this->postJson("/api/v1/todos/{$b->id}/restore")->assertOk();

    $this->getJson('/api/v1/todos')->assertJsonPath('data.*.title', ['C', 'B', 'A']);
});

it('returns 404 when restoring a todo that is not deleted or no longer exists', function (string $kind): void {
    $id = match ($kind) {
        'never deleted' => Todo::factory()->create()->id,
        'purged' => tap(Todo::factory()->create())->forceDelete()->id,
    };

    $this->postJson("/api/v1/todos/{$id}/restore")
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json');
})->with(['never deleted', 'purged']);
