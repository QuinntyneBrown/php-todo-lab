<?php

/**
 * Traces to: L2-038
 */

declare(strict_types=1);

use App\Models\Todo;

function elapsedMs(Closure $request): float
{
    $start = hrtime(true);
    $request();

    return (hrtime(true) - $start) / 1e6;
}

it('answers every endpoint in under 200 ms with 500 todos', function (): void {
    Todo::factory()->count(250)->create();
    Todo::factory()->completed()->count(249)->create();
    $todo = Todo::query()->firstOrFail();
    $this->getJson('/api/v1/todos'); // warm the framework so the first timing is fair

    $timings = [
        'list' => elapsedMs(fn () => $this->getJson('/api/v1/todos')->assertOk()),
        'create' => elapsedMs(fn () => $this->postJson('/api/v1/todos', ['title' => 'Number 500'])->assertCreated()),
        'update' => elapsedMs(fn () => $this->patchJson("/api/v1/todos/{$todo->id}", ['completed' => true])->assertOk()),
        'delete' => elapsedMs(fn () => $this->deleteJson("/api/v1/todos/{$todo->id}")->assertNoContent()),
        'restore' => elapsedMs(fn () => $this->postJson("/api/v1/todos/{$todo->id}/restore")->assertOk()),
    ];
    $ids = [];
    $timings['clear completed'] = elapsedMs(function () use (&$ids): void {
        $ids = $this->deleteJson('/api/v1/todos/completed')->assertOk()->json('data.ids');
    });
    $timings['restore many'] = elapsedMs(fn () => $this->postJson('/api/v1/todos/restore', ['ids' => $ids])->assertOk());

    foreach ($timings as $endpoint => $ms) {
        expect($ms)->toBeLessThan(200, "{$endpoint} took {$ms} ms");
    }
})->group('performance'); // timed without coverage instrumentation; see composer.json `test`
