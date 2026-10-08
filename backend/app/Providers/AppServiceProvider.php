<?php

declare(strict_types=1);

namespace App\Providers;

use App\Repositories\EloquentTodoRepository;
use App\Repositories\TodoRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    public array $bindings = [
        TodoRepository::class => EloquentTodoRepository::class,
    ];
}
