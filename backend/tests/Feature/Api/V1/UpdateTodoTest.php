<?php

/**
 * Traces to: L2-009, L2-013, L2-014, L2-043
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Support\Facades\Process;

it('completes a todo and stamps completedAt', function (): void {
    $todo = Todo::factory()->create();

    $this->patchJson("/api/v1/todos/{$todo->id}", ['completed' => true])
        ->assertOk()
        ->assertJsonPath('data.completed', true)
        ->assertJsonPath('data.completedAt', fn (?string $at): bool => $at !== null
            && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/', $at) === 1);
});

it('reopens a completed todo and clears completedAt', function (): void {
    $todo = Todo::factory()->completed()->create();

    $this->patchJson("/api/v1/todos/{$todo->id}", ['completed' => false])
        ->assertOk()
        ->assertJsonPath('data.completed', false)
        ->assertJsonPath('data.completedAt', null);
});

it('keeps completedAt when completing an already completed todo', function (): void {
    $todo = Todo::factory()->completed()->create();
    $first = $this->getJson('/api/v1/todos')->json('data.0.completedAt');

    $this->travel(5)->minutes();

    $this->patchJson("/api/v1/todos/{$todo->id}", ['completed' => true])
        ->assertOk()
        ->assertJsonPath('data.completedAt', $first);
});

it('rejects a non-boolean completed value', function (mixed $value): void {
    $todo = Todo::factory()->create();

    $this->patchJson("/api/v1/todos/{$todo->id}", ['completed' => $value])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('completed');
})->with(['string' => 'yes', 'number' => 1, 'null' => null]);

it('validates a changed title like a new one', function (mixed $title): void {
    $todo = Todo::factory()->create();

    $this->patchJson("/api/v1/todos/{$todo->id}", ['title' => $title])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
})->with(['201 characters' => str_repeat('a', 201), 'blank' => '   ', 'number' => 7]);

it('updates only the title, trimmed, and leaves completion unchanged', function (): void {
    $todo = Todo::factory()->completed()->create(['title' => 'Call mom']);

    $this->patchJson("/api/v1/todos/{$todo->id}", ['title' => '  Call mom Sunday '])
        ->assertOk()
        ->assertJsonPath('data.title', 'Call mom Sunday')
        ->assertJsonPath('data.completed', true);
});

it('rejects a body with neither title nor completed', function (array $body): void {
    $todo = Todo::factory()->create();

    $this->patchJson("/api/v1/todos/{$todo->id}", $body)->assertUnprocessable();
})->with(['empty' => [[]], 'unknown fields only' => [['colour' => 'red']]]);

it('returns 404 problem details for an unknown, deleted, or malformed id', function (string $kind): void {
    $id = match ($kind) {
        'unknown' => '01jz0000000000000000000000',
        'deleted' => tap(Todo::factory()->create())->delete()->id,
        'malformed' => 'not-a-ulid',
    };

    $this->patchJson("/api/v1/todos/{$id}", ['completed' => true])
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json');
})->with(['unknown', 'deleted', 'malformed']);

it('ignores id, createdAt and deletedAt in the body', function (): void {
    $todo = Todo::factory()->create(['title' => 'Before']);
    $createdAt = $this->getJson('/api/v1/todos')->json('data.0.createdAt');

    $this->patchJson("/api/v1/todos/{$todo->id}", [
        'title' => 'After',
        'id' => '01jz0000000000000000000000',
        'createdAt' => '2000-01-01T00:00:00Z',
        'deletedAt' => '2000-01-01T00:00:00Z',
    ])->assertOk()
        ->assertJsonPath('data.id', $todo->id)
        ->assertJsonPath('data.createdAt', $createdAt);

    expect(Todo::query()->find($todo->id))->not->toBeNull();
});

it('applies each of two concurrent patches in full', function (): void {
    // Committed rows are needed so other processes see them; see TodoLimitTest.
    config(['database.connections.committed' => config('database.connections.mysql')]);
    $todo = Todo::factory()->connection('committed')->create(['title' => 'Original']);

    try {
        $patch = fn (string $title, string $completed): array => [
            PHP_BINARY, 'artisan', 'tinker', '--execute',
            "app(App\\Actions\\Todos\\UpdateTodo::class)->handle('{$todo->id}', ['title' => '{$title}', 'completed' => {$completed}]);",
        ];
        $env = ['DB_DATABASE' => config('database.connections.mysql.database'), 'APP_ENV' => 'testing'];

        $results = Process::pool(function ($pool) use ($patch, $env): void {
            $pool->path(base_path())->env($env)->command($patch('First', 'true'));
            $pool->path(base_path())->env($env)->command($patch('Second', 'false'));
        })->start()->wait();

        $final = Todo::on('committed')->findOrFail($todo->id);
        expect($results->successful())->toBeTrue()
            ->and([$final->title, $final->completed])->toBeIn([['First', true], ['Second', false]]);
    } finally {
        Todo::on('committed')->withTrashed()->forceDelete();
    }
});
