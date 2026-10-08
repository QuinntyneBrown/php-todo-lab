<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Todos\CreateTodo;
use App\Actions\Todos\ListTodos;
use App\Actions\Todos\UpdateTodo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListTodosRequest;
use App\Http\Requests\Api\V1\StoreTodoRequest;
use App\Http\Requests\Api\V1\UpdateTodoRequest;
use App\Http\Resources\V1\TodoCollection;
use App\Http\Resources\V1\TodoResource;
use Illuminate\Http\JsonResponse;

final class TodoController extends Controller
{
    public function index(ListTodosRequest $request, ListTodos $listTodos): TodoCollection
    {
        return new TodoCollection($listTodos->handle($request->status()));
    }

    public function store(StoreTodoRequest $request, CreateTodo $createTodo): JsonResponse
    {
        $todo = $createTodo->handle($request->title());

        return (new TodoResource($todo))->response()
            ->setStatusCode(201)
            ->header('Location', url("/api/v1/todos/{$todo->id}"));
    }

    public function update(UpdateTodoRequest $request, string $todo, UpdateTodo $updateTodo): TodoResource
    {
        return new TodoResource($updateTodo->handle($todo, $request->changes()));
    }
}
