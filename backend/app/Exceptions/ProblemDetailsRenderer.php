<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Throwable;

/**
 * Renders every exception on an API path as RFC 9457 problem details (L2-020).
 * It only shapes the response; reporting still happens through Laravel's handler.
 */
final class ProblemDetailsRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api', 'api/*')) {
            return null;
        }

        return match (true) {
            $e instanceof ValidationException => self::problem(422, 'One or more fields are invalid.', [
                'errors' => $e->errors(),
            ]),
            $e instanceof TodoLimitReached => self::problem(422, $e->getMessage(), [
                'code' => 'todo_limit_reached',
                'errors' => ['title' => [$e->getMessage()]],
            ]),
            $e instanceof ModelNotFoundException => self::problem(404, 'The requested resource was not found.'),
            $e instanceof MethodNotAllowedHttpException => self::problem(
                405,
                "The {$request->method()} method is not supported for this route.",
                headers: $e->getHeaders(),
            ),
            $e instanceof HttpExceptionInterface && $e->getStatusCode() === 404 => self::problem(404, 'The requested resource was not found.'),
            $e instanceof HttpExceptionInterface => self::problem($e->getStatusCode(), $e->getMessage(), headers: $e->getHeaders()),
            default => self::problem(500, 'An unexpected error occurred. Try again later.'),
        };
    }

    /**
     * @param  array<string, mixed>  $extensions
     * @param  array<string, string>  $headers
     */
    private static function problem(int $status, string $detail, array $extensions = [], array $headers = []): JsonResponse
    {
        return new JsonResponse(
            [
                'type' => 'about:blank',
                'title' => Response::$statusTexts[$status] ?? 'Error',
                'status' => $status,
                'detail' => $detail,
                ...$extensions,
            ],
            $status,
            ['Content-Type' => 'application/problem+json', ...$headers],
        );
    }
}
