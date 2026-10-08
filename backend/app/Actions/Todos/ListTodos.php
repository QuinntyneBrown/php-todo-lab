<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Enums\TodoStatus;
use App\Repositories\TodoRepository;

final readonly class ListTodos
{
    public function __construct(private TodoRepository $todos) {}

    public function handle(TodoStatus $status): TodoList
    {
        $counts = $this->todos->counts();

        return new TodoList($this->todos->list($status), $counts['active'], $counts['completed']);
    }
}
