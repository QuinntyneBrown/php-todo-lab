<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Todos\ClearCompletedTodos;
use App\Actions\Todos\CreateTodo;
use App\Actions\Todos\DeleteTodo;
use App\Actions\Todos\ListTodos;
use App\Actions\Todos\RestoreTodo;
use App\Actions\Todos\RestoreTodos;
use App\Actions\Todos\UpdateTodo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListTodosRequest;
use App\Http\Requests\Api\V1\RestoreTodosRequest;
use App\Http\Requests\Api\V1\StoreTodoRequest;
use App\Http\Requests\Api\V1\UpdateTodoRequest;
use App\Http\Resources\V1\ClearedTodosResource;
use App\Http\Resources\V1\TodoCollection;
use App\Http\Resources\V1\TodoResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

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

    public function destroy(string $todo, DeleteTodo $deleteTodo): Response
    {
        $deleteTodo->handle($todo);

        return response()->noContent();
    }

    public function restore(string $todo, RestoreTodo $restoreTodo): TodoResource
    {
        return new TodoResource($restoreTodo->handle($todo));
    }

    public function destroyCompleted(ClearCompletedTodos $clearCompletedTodos): ClearedTodosResource
    {
        return new ClearedTodosResource($clearCompletedTodos->handle());
    }

    public function restoreMany(RestoreTodosRequest $request, RestoreTodos $restoreTodos): AnonymousResourceCollection
    {
        return TodoResource::collection($restoreTodos->handle($request->ids()));
    }
}
