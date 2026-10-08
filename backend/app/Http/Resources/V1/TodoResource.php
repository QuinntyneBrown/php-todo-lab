<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Todo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialises a todo exactly as the v1 contract defines it (L2-019).
 *
 * @property Todo $resource
 */
final class TodoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Reads the stored values in one pass. Casting each timestamp through Carbon
        // costs too much for a 500-row list (L2-038), and stored timestamps are already
        // UTC strings in the model's date format (Todo::fromDateTime), so turning them
        // into ISO-8601 is a string rewrite.
        $stored = $this->resource->getAttributes();

        return [
            'id' => $stored['id'],
            'title' => $stored['title'],
            'completed' => $this->resource->completed,
            'completedAt' => self::iso($stored['completed_at'] ?? null),
            'createdAt' => self::iso($stored['created_at']),
            'updatedAt' => self::iso($stored['updated_at']),
        ];
    }

    /**
     * "2026-10-08 04:33:59.123" (UTC) becomes "2026-10-08T04:33:59.123Z".
     */
    private static function iso(mixed $stored): ?string
    {
        return is_string($stored) ? str_replace(' ', 'T', $stored).'Z' : null;
    }
}
