<?php

/**
 * Traces to: L2-017, L2-043
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

it('soft-deletes every completed todo and returns their ids', function (): void {
    $completed = Todo::factory()->completed()->count(3)->create();
    Todo::factory()->count(2)->create();

    $response = $this->deleteJson('/api/v1/todos/completed')
        ->assertOk()
        ->assertJsonPath('meta.deleted', 3);

    expect(collect($response->json('data.ids'))->sort()->values()->all())
        ->toBe($completed->pluck('id')->sort()->values()->all());
    $this->getJson('/api/v1/todos')
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta', ['active' => 2, 'completed' => 0]);
});

it('reports zero when nothing is completed', function (): void {
    Todo::factory()->count(2)->create();

    $this->deleteJson('/api/v1/todos/completed')
        ->assertOk()
        ->assertJsonPath('data.ids', [])
        ->assertJsonPath('meta.deleted', 0);
});

it('deletes all completed todos or none', function (): void {
    Todo::factory()->completed()->count(3)->create();
    DB::listen(function (QueryExecuted $query): void {
        if (str_starts_with(strtolower($query->sql), 'update')) {
            throw new RuntimeException('Simulated failure after the bulk update');
        }
    });

    $this->deleteJson('/api/v1/todos/completed')->assertStatus(500);

    expect(Todo::query()->completed()->count())->toBe(3);
});
