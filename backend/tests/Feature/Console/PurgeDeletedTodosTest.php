<?php

/**
 * Traces to: L2-016
 */

declare(strict_types=1);

use App\Models\Todo;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Log;

function deletedHoursAgo(int $hours, int $count = 1): void
{
    test()->travelTo(now()->subHours($hours));
    Todo::factory()->count($count)->create()->each->delete();
    test()->travelBack();
}

it('purges todos soft-deleted more than 24 hours ago and keeps the rest', function (): void {
    $this->freezeTime();
    deletedHoursAgo(25);
    deletedHoursAgo(24);
    deletedHoursAgo(23);
    $live = Todo::factory()->create();

    $this->artisan('todos:purge-deleted')->assertSuccessful();

    expect(Todo::withTrashed()->count())->toBe(3)
        ->and(Todo::query()->pluck('id')->all())->toBe([$live->id]);
});

it('exits successfully and logs zero when nothing is eligible', function (): void {
    Log::spy();
    deletedHoursAgo(1);

    $this->artisan('todos:purge-deleted')
        ->expectsOutput('Purged 0 soft-deleted todos.')
        ->assertExitCode(0);

    Log::shouldHaveReceived('info')->with('Purged 0 soft-deleted todos.')->once();
});

it('purges more rows than fit in one chunk', function (): void {
    deletedHoursAgo(48, 1201);

    $this->artisan('todos:purge-deleted')
        ->expectsOutput('Purged 1201 soft-deleted todos.')
        ->assertSuccessful();

    expect(Todo::withTrashed()->count())->toBe(0);
});

it('is scheduled to run hourly', function (): void {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'todos:purge-deleted'));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('0 * * * *');
});
