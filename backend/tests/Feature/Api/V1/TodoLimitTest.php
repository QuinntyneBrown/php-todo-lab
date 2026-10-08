<?php

/**
 * Traces to: L2-003, L2-043
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Support\Facades\Process;

const LIMIT_SENTENCE = 'You have 500 tasks. Finish or delete some to add more.';

it('rejects a create when 500 todos exist', function (): void {
    Todo::factory()->count(500)->create();

    $this->postJson('/api/v1/todos', ['title' => 'One more'])
        ->assertUnprocessable()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'todo_limit_reached')
        ->assertJsonPath('detail', LIMIT_SENTENCE)
        ->assertJsonPath('errors.title', [LIMIT_SENTENCE]);

    expect(Todo::query()->count())->toBe(500);
});

it('accepts a create when 499 todos exist', function (): void {
    Todo::factory()->count(499)->create();

    $this->postJson('/api/v1/todos', ['title' => 'Number 500'])->assertCreated();
});

it('does not count soft-deleted todos toward the limit', function (): void {
    Todo::factory()->count(499)->create();
    Todo::factory()->count(5)->create()->each->delete();

    $this->postJson('/api/v1/todos', ['title' => 'Still fits'])->assertCreated();
});

it('never exceeds the limit under concurrent creates', function (): void {
    // Rows must be committed for other processes to see them, so this test writes
    // through a second connection that RefreshDatabase does not wrap in a transaction.
    config(['database.connections.committed' => config('database.connections.mysql')]);
    Todo::factory()->count(499)->connection('committed')->create();

    try {
        $command = [PHP_BINARY, 'artisan', 'tinker', '--execute',
            'app(App\Actions\Todos\CreateTodo::class)->handle("racer");'];
        $env = ['DB_DATABASE' => config('database.connections.mysql.database'), 'APP_ENV' => 'testing'];

        Process::pool(function ($pool) use ($command, $env): void {
            foreach (range(1, 6) as $_) {
                $pool->path(base_path())->env($env)->command($command);
            }
        })->start()->wait();

        expect(Todo::on('committed')->count())->toBe(500)
            ->and(Todo::on('committed')->where('title', 'racer')->count())->toBe(1);
    } finally {
        Todo::on('committed')->withTrashed()->forceDelete();
    }
});
