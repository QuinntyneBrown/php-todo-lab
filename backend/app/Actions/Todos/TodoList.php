<?php

declare(strict_types=1);

namespace App\Actions\Todos;

use App\Models\Todo;
use Illuminate\Support\Collection;

/** The todos for one filter plus counts across every non-deleted todo (L2-005). */
final readonly class TodoList
{
    /**
     * @param  Collection<int, Todo>  $todos
     */
    public function __construct(
        public Collection $todos,
        public int $active,
        public int $completed,
    ) {}
}
