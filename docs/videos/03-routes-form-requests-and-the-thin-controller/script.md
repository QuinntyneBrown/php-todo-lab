# 03 · Routes, Form Requests and the thin controller

This video follows one HTTP request through the first three layers of the backend: the routes file, a Form Request, and the controller. If you have written an `ApiController` with attribute routing, model binding, and FluentValidation, you already know the shape. What changes is where each responsibility lives, and how explicitly it is written down.

## What you will be able to answer

By the end you will be able to answer: how the seven endpoints are declared and why their order matters, what a Form Request is and how it compares with data annotations or FluentValidation, how a controller method receives validated input and a use case without any registration, and why this controller takes the route id as a string rather than binding it to a model.

## The routes file

Open `routes/api.php`. It is seven lines of routes inside a `Route::prefix('v1')` group. Video two explained that the file is mounted under `api`, so these are the `/api/v1` endpoints from the contract: list, create, update, delete, restore one, clear completed, and restore many. Each route names a controller class and a method as a two-element array. That is attribute routing with the attributes moved out of the controller into one file, and the convention in this repository is that this file holds controllers only, never closures.

Two details carry design weight. First, order. Look at the comment: static paths first. `DELETE /todos/completed` and `POST /todos/restore` are registered before `PATCH /todos/{todo}` and `POST /todos/{todo}/restore`. ASP.NET Core's endpoint routing scores literal segments above parameters automatically, so you never think about it. Laravel matches in registration order, so a `{todo}` route declared first would swallow the word `completed` as an id. The order is the fix, and the comment is there because a reviewer who reorders those lines for tidiness would break the API.

Second, the `whereUlid('todo')` constraint on every parameterised route. It is the equivalent of a `{id:guid}` route constraint. A malformed id matches no route, so the request ends in a 404 before any database work, which is exactly what requirement L2-014 asks for: a bad id is a 404, not a 500.

## Form Requests: validation as a class

Every endpoint with input has a Form Request in `app/Http/Requests/Api/V1`. A Form Request extends Laravel's `FormRequest` and declares a `rules` method that returns an array of field names to rule lists. Laravel validates the request when the container resolves the Form Request for the controller method, so by the time your controller code runs, the input is valid. If validation fails, a `ValidationException` is thrown and the `ProblemDetailsRenderer` turns it into a 422 with an `errors` object. You never write an if statement about `ModelState`.

Compare the three options you know. Data annotations put rules on a DTO. FluentValidation puts them in a validator class resolved by DI. A Laravel Form Request is the FluentValidation shape with one extra responsibility: it also exposes typed accessors for the validated values. Look at `StoreTodoRequest`. The rule for `title` is required, string, maximum two hundred. The docblock explains why that is enough: the global `TrimStrings` and `ConvertEmptyStringsToNull` middleware have already trimmed the value, so whitespace-only becomes null and fails `required`, and `max` counts Unicode characters, not bytes, which is how two hundred emoji pass. Then a `title` method returns the value as a string. The controller calls `$request->title()`, never `$request->all()` and never `$request->input('title')`, so the type is right at the call site and Larastan can check it.

`ListTodosRequest` validates the `status` query parameter with `sometimes`, `string`, and `Rule::enum` against `TodoStatus`. Its `status` accessor returns the enum, defaulting to `All`. That is a backed enum doing the job of a model binder plus a `[JsonConverter]`.

`UpdateTodoRequest` is the partial update. `title` is `required_without` completed, `completed` is `required_without` title, so an empty body fails, and `completed` uses the strict boolean rule, so the string "yes" and the number one are rejected while a JSON true passes. The `changes` accessor builds an array containing only the keys that were present, using `has`, which is how the Action later distinguishes "rename only" from "complete only". In .NET you would model this with nullable properties and a `JsonIgnore` condition, or with JSON Patch; here it is six lines and an array shape in a docblock.

`RestoreTodosRequest` is the interesting one. `ids` must be a non-empty list of at most five hundred ULID strings, and each item is validated by the `ids.*` wildcard rule. Then there is a custom rule: a private `distinct` method passed with first-class callable syntax. Read the comment. Laravel's built-in per-item `distinct` rule compares every pair, which is quadratic and too slow at five hundred ids for the two-hundred-millisecond latency budget, so the class does one pass with `array_unique`. That is the kind of comment that makes a review easy: it names the alternative and the reason it was rejected.

One more thing a .NET developer looks for and does not find: an `authorize` method. Form Requests can declare one and it runs before the rules. This project is single-user with no authentication, so none of these requests declare it, and Laravel treats a missing `authorize` as authorised.

## The thin controller

`TodoController` has seven methods and no logic. Each method's signature asks for what it needs: a Form Request, a route parameter, and an Action. The container builds the Form Request, which triggers validation; it builds the Action with its repository; and the router passes the `{todo}` segment as a string. The body then calls one method on the Action and wraps the result in a Resource. That is the whole class, and requirement L2-044 caps each method at ten lines.

Look at `store`. It calls `handle` with the validated title, then returns the Resource's response with status 201 and a `Location` header built with `url`. That is your `CreatedAtAction`. Look at `destroy`: it calls the Action and returns `response()->noContent()`, your `NoContent()`. `index` returns a `TodoCollection`, `update` and `restore` return a `TodoResource`, and `restoreMany` returns `TodoResource::collection`. Return types are declared on every method, so Larastan knows what each endpoint produces.

Now the deliberate choice. Laravel has implicit route model binding: type-hint `Todo $todo` and the framework loads the row and returns 404 if it is missing. This controller does not use it. The id arrives as a string and the Action does the lookup. Two reasons. The not-found rule is domain logic: an id that points at a soft-deleted todo is a 404 for update and delete, but the same id is valid for restore, which looks only at trashed rows. Route model binding cannot express that per route without configuration, and putting the rule in the Action keeps it unit-testable with the in-memory fake. The second reason is that it keeps Eloquent out of the HTTP layer entirely. That is the same instinct that makes you pass an id into a MediatR handler rather than an entity.

## Reading a request end to end

Put it together for `PATCH /api/v1/todos/{id}`. The router matches the route because the id is a valid ULID. The container resolves `UpdateTodoRequest`, which validates the body and throws on failure. The container resolves the `UpdateTodo` Action with the Eloquent repository. The controller calls `handle` with the id and the changes array. The Action loads the todo through the repository interface or throws `TodoNotFound`, applies the change, and returns the updated model. The controller wraps it in `TodoResource`, and Laravel serialises that under a `data` key. The sequence diagram from the backend layering design shows exactly this path.

## Pitfalls

Reordering routes so a parameterised route precedes a static one. Using `$request->all()` or `$request->input()` in a controller, which bypasses the typed accessor and lets unvalidated keys through. Writing `boolean` instead of `boolean:strict` and accepting "yes" as a completion flag. Reaching for route model binding and then wondering why restore returns 404 for a deleted todo. And putting a query or a condition in a controller because it was only one line; the ten-line cap exists so that temptation is visible in review.

## Things to remember

Routes are explicit, ordered, and constrained with `whereUlid`. A Form Request is FluentValidation plus typed accessors, validated before the controller runs, and it never exposes raw input. The controller receives everything through method injection, calls one Action, and returns a Resource. The id stays a string so the Action owns the not-found rule.

Next, the Actions themselves and the repository interface they depend on, compared with MediatR handlers and Clean Architecture use cases.
