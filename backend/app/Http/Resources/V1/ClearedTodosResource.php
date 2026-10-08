<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The clear-completed response: the deleted ids, for undo, and their count (L2-017).
 *
 * @property list<string> $resource
 */
final class ClearedTodosResource extends JsonResource
{
    /**
     * @param  list<string>  $ids
     */
    public function __construct(array $ids)
    {
        parent::__construct($ids);
    }

    /**
     * @return array{ids: list<string>}
     */
    public function toArray(Request $request): array
    {
        return ['ids' => $this->resource];
    }

    /**
     * @return array{meta: array{deleted: int}}
     */
    public function with(Request $request): array
    {
        return ['meta' => ['deleted' => count($this->resource)]];
    }
}
