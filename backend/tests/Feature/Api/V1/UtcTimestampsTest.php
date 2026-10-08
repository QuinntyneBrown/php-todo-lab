<?php

/**
 * Traces to: L2-043
 */

declare(strict_types=1);

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

afterEach(function (): void {
    date_default_timezone_set('UTC');
});

it('stores and returns UTC timestamps when PHP runs in another timezone', function (): void {
    $this->freezeTime();
    date_default_timezone_set('Asia/Tokyo');
    $utcNow = CarbonImmutable::now('UTC');

    $response = $this->postJson('/api/v1/todos', ['title' => 'Across time zones'])->assertCreated();

    expect($response->json('data.createdAt'))->toBe($utcNow->format('Y-m-d\TH:i:s.v\Z'));
    $stored = DB::table('todos')->value('created_at');
    expect(substr((string) $stored, 0, 19))->toBe($utcNow->format('Y-m-d H:i:s'));
});
