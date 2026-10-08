<?php

/**
 * Traces to: L2-017, L2-043
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

it('restores cleared todos by id', function (): void {
    Todo::factory()->completed()->count(3)->create();
    Todo::factory()->count(2)->create();
    $ids = $this->deleteJson('/api/v1/todos/completed')->json('data.ids');

    $response = $this->postJson('/api/v1/todos/restore', ['ids' => $ids])->assertOk();

    expect(collect($response->json('data.*.id'))->sort()->values()->all())
        ->toBe(collect($ids)->sort()->values()->all())
        ->and($response->json('data.*.completed'))->each->toBeTrue();
    $this->getJson('/api/v1/todos')->assertJsonPath('meta', ['active' => 2, 'completed' => 3]);
});

it('ignores ids that are not deleted', function (): void {
    $deleted = tap(Todo::factory()->create())->delete();
    $live = Todo::factory()->create();

    $this->postJson('/api/v1/todos/restore', ['ids' => [$deleted->id, $live->id]])
        ->assertOk()
        ->assertJsonPath('data.*.id', [$deleted->id]);
});

it('validates the ids', function (mixed $ids): void {
    $this->postJson('/api/v1/todos/restore', ['ids' => $ids])
        ->assertUnprocessable()
        ->assertHeader('Content-Type', 'application/problem+json');
})->with([
    'missing' => null,
    'empty' => [[]],
    'not an array' => '01jz0000000000000000000000',
    'not ULIDs' => [['nope']],
    'duplicates' => [['01jz0000000000000000000000', '01jz0000000000000000000000']],
    'too many' => [array_map(fn (int $n): string => sprintf('01jz%022d', $n), range(1, 501))],
]);

it('restores all requested todos or none', function (): void {
    $ids = Todo::factory()->count(3)->create()->each->delete()->pluck('id')->all();
    DB::listen(function (QueryExecuted $query): void {
        if (str_starts_with(strtolower($query->sql), 'update')) {
            throw new RuntimeException('Simulated failure after the bulk restore');
        }
    });

    $this->postJson('/api/v1/todos/restore', ['ids' => $ids])->assertStatus(500);

    expect(Todo::onlyTrashed()->count())->toBe(3);
});
