# 08 · Problem details and exception handling

ASP.NET Core gives you `ProblemDetails`, `AddProblemDetails`, and `IExceptionHandler`, and with an `ApiController` attribute you get RFC 7807 bodies for validation failures without writing code. Laravel's defaults are different: validation returns its own JSON shape, unknown routes can return an HTML page, and a crash returns an HTML error page unless you tell it otherwise. This backend replaces all of that with one class, `ProblemDetailsRenderer`, so that every error on an API path is RFC 9457 problem details. This video reads that class, the exceptions it maps, and the tests that pin each status.

## What you will be able to answer

By the end you will be able to answer: where exception rendering is registered and how it compares with `IExceptionHandler`, how every error class is mapped to a status, a title, a detail, and extension members, why the renderer looks at the request path rather than the `Accept` header, how a 500 avoids leaking internals, and how the tests prove it without a running server.

## Registration: one callback in the bootstrap

Video two showed `bootstrap/app.php`. Its `withExceptions` callback calls `$exceptions->render` with a new `ProblemDetailsRenderer`. That is the whole registration. In ASP.NET Core you would write a class implementing `IExceptionHandler`, register it with `AddExceptionHandler`, and call `UseExceptionHandler`. Here the renderer is an invokable class, a class with an `__invoke` method, which Laravel calls with the exception and the request. If it returns a response, that response is sent; if it returns null, Laravel falls through to its default rendering. Reporting, which means logging, is untouched: the renderer only shapes the response, and the comment at the top of the class says so.

## The renderer, arm by arm

Open `app/Exceptions/ProblemDetailsRenderer.php`. The `__invoke` method first checks whether the request path is `api` or starts with `api/`, and returns null otherwise. That is deliberate: the API never returns HTML, whatever the client's `Accept` header says, which is requirement L2-020. `ProblemDetailsTest` sends requests with `Accept: text/html` and still gets JSON.

Then comes a single `match` on true, which is the PHP idiom for an ordered type switch, like a C# `switch` expression with type patterns. Read the arms in order, because order matters as it does with `catch` blocks.

A `ValidationException`, thrown by any Form Request, becomes 422 with the detail "One or more fields are invalid." and an `errors` extension member that maps field names to arrays of messages. That is the `ValidationProblemDetails` shape you know, with Laravel's messages inside.

A `TodoLimitReached`, the domain exception from video four, also becomes 422, but with the exception's own message as the detail, a `code` member set to `todo_limit_reached`, and an `errors` object putting the same sentence under `title`, so the UI can show it at the composer. Requirement L2-003 asks for exactly that code.

A `TodoNotFound` or Laravel's own `ModelNotFoundException` becomes 404 with a fixed detail. This repository does not use route model binding, so the second type is defensive, but it costs one line.

A `MethodNotAllowedHttpException` becomes 405, with the detail naming the method the client used, and the exception's headers forwarded, which carries the `Allow` header that requirement L2-018 demands.

Then two general arms for anything implementing `HttpExceptionInterface`, Symfony's interface for exceptions that know their status code. A 404 from the router, such as an unknown path or an id that fails the `whereUlid` constraint, gets the same fixed not-found detail as the domain exception, so a client cannot tell whether the route or the row was missing. Any other HTTP exception keeps its status, message, and headers.

The default arm catches everything else and returns 500 with the fixed sentence "An unexpected error occurred. Try again later." The message, class, and trace of the original exception never reach the body. `ProblemDetailsTest` proves this by registering a throwaway route that throws a `RuntimeException` with the text "secret internals" and asserting the response does not contain it. The exception is still reported to the log, because reporting is separate from rendering.

## The body shape

The private `problem` method builds the response. The body has the four RFC 9457 members: `type` set to `about:blank`, `title` set to the HTTP reason phrase looked up from Symfony's status text table, `status` as an integer, and `detail`. Extension members, like `errors` and `code`, are spread into the body after those four. The content type is `application/problem+json`, and any extra headers, such as `Allow`, are spread into the header array. Compare the .NET `ProblemDetails` class: same four members, same `Extensions` dictionary, same media type. The difference is that here the mapping is one readable function rather than a mix of defaults, options, and handlers.

## Tests pin every status

`ProblemDetailsTest` has a helper that asserts the status, the content type, and the four members, and then four tests: validation becomes 422 with `errors`, unknown API routes including `/api/v2/todos` become 404 and never HTML, an unsupported method becomes 405 with an `Allow` header that includes GET, and an unhandled exception becomes 500 without leaking the message. `TodoLimitTest` adds the 422 with `code` and the exact sentence. Every error-path test in the suite also asserts the `application/problem+json` content type, so a regression in the renderer fails many tests at once.

These are feature tests through Laravel's HTTP test client, which runs the full request pipeline in-process without a web server. That is `WebApplicationFactory` without the factory: `$this->getJson` or `$this->postJson` and assertions on the response, with the real router, middleware, and renderer in the loop. Video ten covers the test suite in depth.

## Pitfalls

Catching exceptions in a controller or an Action to return a JSON error by hand, which bypasses the renderer and produces a second error shape. Checking `expectsJson` or the `Accept` header instead of the path, which lets a browser get HTML from the API. Putting the generic `HttpExceptionInterface` arm before the specific 404 and 405 arms, which loses the fixed detail and the `Allow` forwarding. Letting a 500 echo `getMessage`, which leaks internals. And adding a new domain exception without an arm here, which turns a meaningful failure into a generic 500; the arm and a test are part of the exception's definition.

## Things to remember

One invokable renderer, registered in `bootstrap/app.php`, shapes every API error; reporting stays with Laravel. It applies by path, not by `Accept` header, so the API never returns HTML. A `match` on true maps validation to 422 with `errors`, the limit to 422 with a code, not-found and bad ids to a fixed 404, bad methods to 405 with `Allow`, and everything else to a fixed 500. The body is the four RFC 9457 members plus extensions, under `application/problem+json`. Every status has a test.

Next, the Artisan command and the scheduler: hourly purging of soft-deleted todos, compared with hosted services and background jobs.
