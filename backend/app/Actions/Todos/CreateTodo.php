<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Models\Todo;
use App\Repositories\TodoRepository;

final readonly class CreateTodo
{
    public function __construct(private TodoRepository $todos) {}

    public function handle(string $title): Todo
    {
        return $this->todos->create($title);
    }
}
