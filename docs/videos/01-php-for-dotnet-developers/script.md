# 01 · PHP 8.4 for .NET developers

Welcome to php-todo-lab for .NET developers. This series takes a senior .NET engineer, someone who lives in C#, Entity Framework, Clean Architecture and MediatR, and makes them productive in a modern PHP backend. Not a toy backend: a Laravel API with strict types, static analysis at the highest level, acceptance tests against a real database, and a layered architecture you will recognise immediately. By the end of the twelve videos you will be able to write code in this backend and review a PHP pull request with confidence.

This first video is about the language itself. Everything on screen comes from the repository, from the `backend` folder, so you are learning PHP from code that passes a real quality gate rather than from slides invented for a tutorial.

## What you will be able to answer

By the end of this video you will be able to answer four questions. How does a PHP process run compared with a Kestrel process? What does `declare(strict_types=1)` buy you, and what does it not? Which modern PHP constructs map to the C# features you use every day, like records, enums, switch expressions, and lambdas? And which habits from C# will trip you up in PHP?

## The execution model

Start with the thing that surprises .NET developers most. ASP.NET Core runs one long-lived process. Your dependency container is built once, your singletons live for days, and a static field is shared by every request. PHP's traditional model is shared-nothing. Every HTTP request starts with an empty memory space, the framework boots, your code runs, the response is sent, and everything is thrown away. The next request starts from zero again.

That has consequences you will feel. There is no in-process cache unless you reach for one explicitly. A static property does not survive between requests. And the framework boot cost is paid on every request, which is why Laravel caches its configuration and routes to disk in production. Laravel does offer a long-lived mode called Octane, but this repository does not use it, and most PHP applications do not.

The second surprise is that there is no compile step. Nothing produces a DLL. Composer, which is PHP's NuGet, writes an autoloader that maps a namespace prefix to a folder. Look at `composer.json` in the backend: the `App` namespace maps to the `app` directory, and `Tests` maps to `tests`. That standard is called PSR-4, and it is the whole story behind namespaces resolving to files. The class `App\Actions\Todos\CreateTodo` lives at `app/Actions/Todos/CreateTodo.php`, and it must, or the autoloader cannot find it. The namespace separator is a backslash, which looks odd for a week and then you stop noticing.

So the mental model is: PHP is a scripting language with a per-request lifecycle, loaded by convention from the file system, with a NuGet-like package manager. Everything else, the types, the classes, the enums, is closer to C# than you expect.

## Strict types and the type system

Open any file in this backend and the first statement after the opening tag is `declare(strict_types=1)`. In C# you never think about this, because the compiler rejects passing a string where an int is expected. PHP by default coerces: pass the string "5" to an int parameter and it silently becomes five. With strict types on, that call throws a type error instead. The declaration applies to calls made from that file, so it has to be in every file, and this repository enforces that with the formatter, which you will see in video eleven.

PHP's types are real and checked at runtime. Parameters, return values, and properties all carry types. Look at `CreateTodo`: the `handle` method takes a string called title and returns a `Todo`. The repository interface's `find` method returns a nullable `Todo`, written with a question mark before the type, exactly like C#'s nullable reference annotation but enforced at runtime rather than by analysis.

Where PHP is weaker than C# is generics and collections. PHP has one array type, and it is both a list and a dictionary. It is ordered, it is keyed by integer or string, and it is a value type: assigning an array copies it. There is no `List` of `T`. So how does the code say "a list of strings"? In docblocks. Look at `ClearCompletedTodos`: its `handle` method is typed as returning an array, and the docblock above it says it returns a list of string. Larastan, the static analyser you will meet in video eleven, reads those docblocks and checks them, so the docblock is not decoration, it is the generic type system. You will also see shapes like an array with an active integer key and a completed integer key on the `counts` method. Treat a docblock type the way you treat a C# generic constraint: mandatory, and checked.

## Classes, records, and enums

Now the pleasant part. Look at `CreateTodo` again. It is declared as a `final readonly class` with a constructor that takes a private `TodoRepository`. That single line does three things you would do with a C# record: it declares the property, it assigns it, and it makes the whole object immutable after construction. Constructor property promotion arrived in PHP eight, readonly classes in eight point two, and typed class constants, like the `LIMIT` constant of five hundred, in eight point three. If you have used C# primary constructors on a sealed record, you already understand this file.

Enums are the next thing to recognise. `TodoStatus` is a backed enum with three cases: All, Active, and Completed, each backed by a lowercase string. A backed enum is a C# enum plus the string conversion you normally hand-write. Laravel validates request input against it, and the repository switches on it with `match`.

`match` is PHP's switch expression. Look at `EloquentTodoRepository`'s `list` method: it matches on the status and applies a scope for Active and for Completed, and does nothing for All. `match` uses strict comparison, has no fall-through, must be exhaustive, and throws if no arm matches. It is closer to C#'s switch expression than to the old `switch` statement, so prefer it.

Null handling will feel familiar. The null coalescing operator is two question marks, same as C#. The null-safe operator is question mark arrow, same idea as C#'s question mark dot. And PHP lets you throw as an expression. Look at `DeleteTodo`: it calls `find`, and if the result is null, the coalescing operator evaluates a `throw new TodoNotFound`. That one line is the entire not-found guard, and you will see it in every Action that loads by id.

Lambdas come in two flavours. The short form, `fn`, is an expression-bodied lambda that captures the enclosing scope automatically, like C#. The long form, `function` with a `use` clause, captures only the variables you name, by value unless you add an ampersand. You will see the long form in `createWithinLimit`, where a transaction closure uses the title and the limit. First-class callable syntax, a function name followed by three dots in parentheses, turns any function or method into a closure. `RestoreTodosRequest` passes `strtolower` that way to `array_map`, which is the PHP spelling of a C# method group conversion.

Named arguments exist too. The migration calls `timestamp` with `precision` named three, and the repository calls `transaction` with `attempts` named three. Same syntax as C#, with a colon instead of a colon-equals.

## Reading the syntax

A few syntax differences that stop being noise after a day. Variables start with a dollar sign, and the variable `$this` is the same as C#'s this keyword. The arrow operator, a hyphen and a greater-than sign, is member access on an instance, so `$this->todos` is C#'s `this.todos`. Two colons access static members, class constants, and the `class` keyword, so `TodoRepository::class` is the fully qualified class name as a string, roughly `typeof` of `TodoRepository` as a name. Double-quoted strings interpolate: `PurgeDeletedTodos` builds its log line as "Purged, then the purged count in braces, then soft-deleted todos" inside double quotes, which is C#'s dollar-string. Single-quoted strings never interpolate, so use them for plain literals, and the formatter will insist.

Array literals use square brackets, and the arrow-equals pair separates keys from values. A spread of three dots merges arrays, and `ProblemDetailsRenderer` uses it to merge extension members into the problem body, which is the C# collection expression spread. Functions in the global namespace, like `array_map`, `array_key_exists`, `count`, and `str_replace`, are the standard library; there is no `System.Linq`, but Laravel's `Collection` class gives you `map`, `filter`, `pluck`, and friends, which you will see in the test fake.

## Pitfalls for C# hands

Five things that will bite you. First, comparison. Two equals signs is loose comparison with type juggling. Three equals signs is strict. Always write three, and the same for not-equals. The one exception in this codebase is `match`, which is strict already.

Second, arrays are values. Pass an array to a function and modify it, and the caller does not see the change. Objects are handles, like C# reference types, but arrays are not. This is the opposite of a C# `List`, and it is the source of a whole class of "why did my change disappear" bugs.

Third, truthiness. An empty string, the string "0", an empty array, and zero are all false in a boolean context. Never rely on it; compare explicitly, and in this backend Larastan will flag many of the sloppy cases anyway.

Fourth, static state does not persist, and global state is a smell. If you find yourself wanting a static cache, you want Laravel's cache or the database.

Fifth, strict types only covers scalar coercion at call boundaries. It does not make an untyped array into a typed one, and it does not stop a function from returning the wrong shape inside an array. The docblock plus Larastan is what covers that, which is why a PHP review always reads the docblocks.

## Things to remember

Shared-nothing per request, no compile step, and PSR-4 autoloading by file path. Strict types in every file, real runtime types on every signature, and docblocks as the generic type system that Larastan checks. Readonly classes with promoted constructors are your records, backed enums are your enums with conversion built in, and `match` is your switch expression. Three equals signs, arrays are values, and no static state.

Next, we look at how Laravel itself boots and wires dependencies, through the eyes of someone who knows `Program.cs` and `IServiceCollection`.
