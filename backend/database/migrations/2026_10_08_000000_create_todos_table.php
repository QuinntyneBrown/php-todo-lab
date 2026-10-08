<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('todos', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');

            $table->ulid('id')->primary();
            $table->string('title', 200);
            $table->timestamp('completed_at', precision: 3)->nullable();
            $table->timestamps(precision: 3);
            $table->softDeletes(precision: 3);

            // Serves the list query: non-deleted, newest first, ties by id (L2-005).
            $table->index(['deleted_at', 'created_at', 'id'], 'todos_deleted_at_created_at_id_index');
            // Serves counts and bulk operations by completion (L2-005, L2-017).
            $table->index(['deleted_at', 'completed_at'], 'todos_deleted_at_completed_at_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todos');
    }
};
