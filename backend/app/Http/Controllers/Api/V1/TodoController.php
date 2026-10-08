<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\Todos\ListTodos;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListTodosRequest;
use App\Http\Resources\V1\TodoCollection;

final class TodoController extends Controller
{
    public function index(ListTodosRequest $request, ListTodos $listTodos): TodoCollection
    {
        return new TodoCollection($listTodos->handle($request->status()));
    }
}
