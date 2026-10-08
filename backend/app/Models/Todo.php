<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\TodoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $title
 * @property CarbonImmutable|null $completed_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property CarbonImmutable|null $deleted_at
 * @property-read bool $completed
 */
class Todo extends Model
{
    /** @use HasFactory<TodoFactory> */
    use HasFactory;

    use HasUlids;
    use SoftDeletes;

    /** Keeps the millisecond precision of the TIMESTAMP(3) columns. */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    /** `id` is absent, so a client-supplied id never reaches the row (L2-021). */
    protected $fillable = ['title', 'completed_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'completed_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
            'deleted_at' => 'immutable_datetime',
        ];
    }

    /**
     * Writes every timestamp as UTC, whatever PHP's default timezone is (L2-043).
     */
    public function fromDateTime(mixed $value): mixed
    {
        return $value === null || $value === ''
            ? $value
            : $this->asDateTime($value)->utc()->format($this->getDateFormat());
    }

    /**
     * Reads stored timestamps as UTC: the connection runs at +00:00 (config/database.php).
     * Naming the zone also spares Carbon a default-zone lookup on every parse.
     */
    protected function asDateTime(mixed $value): Carbon
    {
        if (is_string($value)) {
            $parsed = Carbon::createFromFormat($this->getDateFormat(), $value, 'UTC');
            if ($parsed !== null) {
                return $parsed;
            }
        }

        return parent::asDateTime($value);
    }

    /**
     * Derived from the stored column, not stored itself (L2-019).
     *
     * @return Attribute<bool, never>
     */
    protected function completed(): Attribute
    {
        return Attribute::get(fn (): bool => ($this->getAttributes()['completed_at'] ?? null) !== null);
    }

    /**
     * @param  Builder<Todo>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('completed_at');
    }

    /**
     * @param  Builder<Todo>  $query
     */
    public function scopeCompleted(Builder $query): void
    {
        $query->whereNotNull('completed_at');
    }
}
