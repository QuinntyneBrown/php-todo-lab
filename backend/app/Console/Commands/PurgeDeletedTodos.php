<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Repositories\TodoRepository;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/** Permanently removes todos soft-deleted more than 24 hours ago (L2-016). */
final class PurgeDeletedTodos extends Command
{
    public const int RETENTION_HOURS = 24;

    /** Small chunks keep each DELETE short, so it never holds long locks. */
    public const int CHUNK_SIZE = 500;

    protected $signature = 'todos:purge-deleted';

    protected $description = 'Permanently delete todos soft-deleted more than 24 hours ago';

    public function handle(TodoRepository $todos): int
    {
        $cutoff = now()->toImmutable()->subHours(self::RETENTION_HOURS);
        $purged = 0;

        do {
            $chunk = $todos->purgeDeletedBefore($cutoff, self::CHUNK_SIZE);
            $purged += $chunk;
        } while ($chunk === self::CHUNK_SIZE);

        $message = "Purged {$purged} soft-deleted todos.";
        Log::info($message);
        $this->info($message);

        return self::SUCCESS;
    }
}
