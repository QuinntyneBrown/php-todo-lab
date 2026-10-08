<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/** No non-deleted todo has the given id (L2-014). */
final class TodoNotFound extends RuntimeException
{
    public function __construct(public readonly string $id)
    {
        parent::__construct("No todo with id {$id}.");
    }
}
