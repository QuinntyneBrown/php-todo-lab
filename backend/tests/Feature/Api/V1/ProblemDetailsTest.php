<?php

/**
 * Traces to: L2-018, L2-020
 */

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

function assertProblem(Illuminate\Testing\TestResponse $response, int $status, string $title, string $detail): void
{
    $response->assertStatus($status)
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('type', 'about:blank')
        ->assertJsonPath('title', $title)
        ->assertJsonPath('status', $status)
        ->assertJsonPath('detail', $detail);
}

it('renders validation failures as 422 problem details with errors', function (): void {
    $response = $this->getJson('/api/v1/todos?status=bogus');

    assertProblem($response, 422, 'Unprocessable Content', 'One or more fields are invalid.');
    expect($response->json('errors.status'))->toBeArray()->not->toBeEmpty();
});

it('renders unknown API routes as 404 problem details, never HTML', function (string $uri): void {
    $response = $this->get($uri, ['Accept' => 'text/html']);

    assertProblem($response, 404, 'Not Found', 'The requested resource was not found.');
})->with([
    'unknown v1 path' => '/api/v1/nope',
    'unsupported version' => '/api/v2/todos',
]);

it('renders an unsupported method as 405 with an Allow header', function (): void {
    $response = $this->putJson('/api/v1/todos');

    assertProblem($response, 405, 'Method Not Allowed', 'The PUT method is not supported for this route.');
    expect($response->headers->get('Allow'))->toContain('GET');
});

it('renders unhandled exceptions as 500 problem details without leaking the message', function (): void {
    Route::get('api/v1/boom', fn () => throw new RuntimeException('secret internals'));

    $response = $this->get('/api/v1/boom', ['Accept' => 'text/html']);

    assertProblem($response, 500, 'Internal Server Error', 'An unexpected error occurred. Try again later.');
    expect($response->getContent())->not->toContain('secret internals');
});
