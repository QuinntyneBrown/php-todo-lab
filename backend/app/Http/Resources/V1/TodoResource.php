<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\Todo;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialises a todo exactly as the v1 contract defines it (L2-019).
 *
 * @mixin Todo
 */
final class TodoResource extends JsonResource
{
    /**
     * @return array{id: string, title: string, completed: bool, completedAt: string|null, createdAt: string, updatedAt: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'completed' => $this->completed,
            'completedAt' => self::timestamp($this->completed_at),
            'createdAt' => self::timestamp($this->created_at),
            'updatedAt' => self::timestamp($this->updated_at),
        ];
    }

    /**
     * @return ($value is null ? null : string)
     */
    private static function timestamp(?CarbonInterface $value): ?string
    {
        return $value?->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
