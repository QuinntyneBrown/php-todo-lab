<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Models\Todo;
use App\Repositories\TodoRepository;

final readonly class CreateTodo
{
    /** The most non-deleted todos the list may hold (L2-003). */
    public const int LIMIT = 500;

    public function __construct(private TodoRepository $todos) {}

    public function handle(string $title): Todo
    {
        return $this->todos->createWithinLimit($title, self::LIMIT);
    }
}
