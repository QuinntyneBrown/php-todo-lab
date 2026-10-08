<?php

/**
 * Traces to: L2-005, L2-006, L2-019
 */

declare(strict_types=1);

use App\Models\Todo;

const ISO_8601_UTC = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/';

function createdInOrder(string ...$titles): void
{
    foreach ($titles as $i => $title) {
        test()->travelTo(now()->startOfMinute()->addSeconds($i));
        Todo::factory()->create(['title' => $title]);
    }
    test()->travelBack();
}

it('lists todos newest first', function (): void {
    createdInOrder('A', 'B', 'C');

    $this->getJson('/api/v1/todos')
        ->assertOk()
        ->assertJsonPath('data.*.title', ['C', 'B', 'A']);
});

it('keeps a completed todo in its original position', function (): void {
    createdInOrder('A', 'B', 'C');
    Todo::query()->where('title', 'B')->firstOrFail()->update(['completed_at' => now()]);

    $this->getJson('/api/v1/todos')->assertJsonPath('data.*.title', ['C', 'B', 'A']);
});

it('breaks createdAt ties by id descending', function (): void {
    $this->freezeTime();
    $ids = Todo::factory()->count(3)->create()->pluck('id')->sortDesc()->values()->all();

    $this->getJson('/api/v1/todos')->assertJsonPath('data.*.id', $ids);
});

it('returns active and completed counts for all non-deleted todos regardless of filter', function (): void {
    Todo::factory()->count(3)->create();
    Todo::factory()->completed()->count(2)->create();
    Todo::factory()->create()->delete();

    foreach (['', '?status=all', '?status=active', '?status=completed'] as $query) {
        $this->getJson('/api/v1/todos'.$query)
            ->assertOk()
            ->assertExactJsonStructure(['data', 'meta' => ['active', 'completed']])
            ->assertJsonPath('meta', ['active' => 3, 'completed' => 2]);
    }
});

it('never returns soft-deleted todos', function (): void {
    $kept = Todo::factory()->create();
    Todo::factory()->create()->delete();

    $this->getJson('/api/v1/todos')->assertJsonPath('data.*.id', [$kept->id]);
});

it('filters by status', function (string $status, int $expected): void {
    Todo::factory()->count(3)->create();
    Todo::factory()->completed()->count(2)->create();

    $response = $this->getJson('/api/v1/todos?status='.$status)->assertOk();

    expect($response->json('data'))->toHaveCount($expected);
})->with([
    'all' => ['all', 5],
    'active' => ['active', 3],
    'completed' => ['completed', 2],
]);

it('rejects an unknown status', function (): void {
    $this->getJson('/api/v1/todos?status=bogus')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

it('serialises a todo with exactly the contract fields', function (): void {
    $todo = Todo::factory()->completed()->create(['title' => 'Call mom']);
    Todo::factory()->create();

    $response = $this->getJson('/api/v1/todos?status=completed')->assertOk();
    $item = $response->json('data.0');

    expect(array_keys($item))->toBe(['id', 'title', 'completed', 'completedAt', 'createdAt', 'updatedAt'])
        ->and($item['id'])->toBe($todo->id)
        ->and($item['title'])->toBe('Call mom')
        ->and($item['completed'])->toBeTrue()
        ->and($item['completedAt'])->toMatch(ISO_8601_UTC)
        ->and($item['createdAt'])->toMatch(ISO_8601_UTC)
        ->and($item['updatedAt'])->toMatch(ISO_8601_UTC);
});

it('serialises an active todo with completed false and a null completedAt', function (): void {
    Todo::factory()->create();

    $this->getJson('/api/v1/todos')
        ->assertJsonPath('data.0.completed', false)
        ->assertJsonPath('data.0.completedAt', null);
});
