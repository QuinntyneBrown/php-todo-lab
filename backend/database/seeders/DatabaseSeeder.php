<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Todo;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * A handful of sample tasks, oldest first, so the list shows a mix (L2-054).
     */
    public function run(): void
    {
        $samples = [
            ['Water the plants', true],
            ['Book a dentist appointment', true],
            ['Call mom', false],
            ['Buy oat milk', false],
            ['Read chapter 3 of the Laravel docs', false],
        ];

        foreach ($samples as $index => [$title, $completed]) {
            $createdAt = now()->subMinutes(count($samples) - $index);

            Todo::factory()->create([
                'title' => $title,
                'completed_at' => $completed ? $createdAt->copy()->addSeconds(30) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }
    }
}
