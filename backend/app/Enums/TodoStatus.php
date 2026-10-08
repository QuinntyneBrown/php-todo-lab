<?php

declare(strict_types=1);

namespace App\Enums;

/** The list filter accepted by `GET /api/v1/todos?status=` (L2-006, L2-044). */
enum TodoStatus: string
{
    case All = 'all';
    case Active = 'active';
    case Completed = 'completed';
}
