<?php

/**
 * Traces to: L2-054
 */

declare(strict_types=1);

use App\Models\Todo;

it('seeds a handful of sample tasks, some completed', function (): void {
    $this->seed();

    expect(Todo::query()->count())->toBeBetween(3, 10)
        ->and(Todo::query()->completed()->count())->toBeGreaterThan(0)
        ->and(Todo::query()->active()->count())->toBeGreaterThan(0);
});
