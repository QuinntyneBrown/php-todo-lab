<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Actions\Todos\TodoList;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

/** The list response: `data` of todos plus `meta` counts (L2-005). */
final class TodoCollection extends ResourceCollection
{
    public $collects = TodoResource::class;

    public function __construct(private readonly TodoList $list)
    {
        parent::__construct($list->todos);
    }

    /**
     * @return array{meta: array{active: int, completed: int}}
     */
    public function with(Request $request): array
    {
        return ['meta' => ['active' => $this->list->active, 'completed' => $this->list->completed]];
    }
}
