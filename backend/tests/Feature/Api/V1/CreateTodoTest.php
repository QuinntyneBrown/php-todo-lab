<?php

/**
 * Traces to: L2-001, L2-002, L2-021
 */

declare(strict_types=1);

use App\Models\Todo;

it('creates a todo and returns 201 with a Location header', function (): void {
    $response = $this->postJson('/api/v1/todos', ['title' => 'Buy oat milk'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Buy oat milk')
        ->assertJsonPath('data.completed', false)
        ->assertJsonPath('data.completedAt', null);

    $id = $response->json('data.id');
    $response->assertHeader('Location', url("/api/v1/todos/{$id}"));
    expect(Todo::query()->find($id)?->title)->toBe('Buy oat milk');
});

it('accepts a title of exactly 200 characters', function (): void {
    $this->postJson('/api/v1/todos', ['title' => str_repeat('a', 200)])->assertCreated();
});

it('rejects a title of 201 characters', function (): void {
    $this->postJson('/api/v1/todos', ['title' => str_repeat('a', 201)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect(Todo::query()->count())->toBe(0);
});

it('counts characters, not bytes, so 200 emoji are accepted', function (): void {
    $title = str_repeat('🍣', 200);

    $this->postJson('/api/v1/todos', ['title' => $title])
        ->assertCreated()
        ->assertJsonPath('data.title', $title);
});

it('trims leading and trailing whitespace', function (): void {
    $this->postJson('/api/v1/todos', ['title' => '  Walk the dog  '])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Walk the dog');
});

it('rejects a missing, empty, whitespace-only, or non-string title', function (array $body): void {
    $this->postJson('/api/v1/todos', $body)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
})->with([
    'missing' => [[]],
    'empty' => [['title' => '']],
    'whitespace only' => [['title' => '   ']],
    'number' => [['title' => 42]],
    'array' => [['title' => ['x']]],
]);

it('ignores a client-supplied id and generates a ULID', function (): void {
    $response = $this->postJson('/api/v1/todos', ['id' => 'client-chosen', 'title' => 'Mine'])->assertCreated();

    expect($response->json('data.id'))->not->toBe('client-chosen')->toHaveLength(26);
});
