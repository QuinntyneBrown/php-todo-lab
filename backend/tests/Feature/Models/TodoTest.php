<?php

/**
 * Traces to: L2-021, L2-045
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

it('creates a todo and reads it back after migrating', function (): void {
    $todo = Todo::factory()->create(['title' => 'Buy oat milk']);

    $found = Todo::query()->findOrFail($todo->id);

    expect($found->title)->toBe('Buy oat milk')
        ->and($found->id)->toHaveLength(26)
        ->and($found->completed)->toBeFalse()
        ->and($found->completed_at)->toBeNull();
});

it('drops the todos table on rollback and recreates it on migrate', function (): void {
    Artisan::call('migrate:rollback', ['--force' => true]);
    expect(Schema::hasTable('todos'))->toBeFalse();

    Artisan::call('migrate', ['--force' => true]);
    expect(Schema::hasTable('todos'))->toBeTrue();
});

it('round-trips emoji and CJK titles unchanged', function (): void {
    $title = '寿司を買う 🍣 and 🧋 then 학교';
    $todo = Todo::factory()->create(['title' => $title]);

    expect(Todo::query()->findOrFail($todo->id)->title)->toBe($title);
});

it('derives completed from completed_at', function (): void {
    $todo = Todo::factory()->completed()->create();

    expect($todo->fresh()?->completed)->toBeTrue();
});

it('scopes active and completed todos, excluding soft-deleted ones', function (): void {
    $active = Todo::factory()->count(3)->create();
    $completed = Todo::factory()->completed()->count(2)->create();
    Todo::factory()->create()->delete();
    Todo::factory()->completed()->create()->delete();

    expect(Todo::query()->active()->pluck('id')->sort()->values()->all())
        ->toBe($active->pluck('id')->sort()->values()->all())
        ->and(Todo::query()->completed()->pluck('id')->sort()->values()->all())
        ->toBe($completed->pluck('id')->sort()->values()->all());
});
