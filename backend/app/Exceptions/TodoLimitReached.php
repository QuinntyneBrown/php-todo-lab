<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/** Creating another todo would exceed the cap on non-deleted todos (L2-003). */
final class TodoLimitReached extends RuntimeException
{
    public function __construct(public readonly int $limit)
    {
        parent::__construct("You have {$limit} tasks. Finish or delete some to add more.");
    }
}
