import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  type MonoTypeOperatorFunction,
  type Observable,
  catchError,
  firstValueFrom,
  retry,
  throwError,
  timeout,
  timer,
} from 'rxjs';
import { ApiError } from './api-error';
import type {
  ClearCompletedResponse,
  ProblemDetails,
  Todo,
  TodoListResponse,
  UpdateTodoPayload,
} from './models';
import { TodoApi } from './todo-api';

const BASE = '/api/v1/todos';

/** No response within this time counts as a network error (L2-042 criterion 4). */
const TIMEOUT_MS = 10_000;

/** Delays before the 2nd and 3rd attempt of an idempotent read (L2-042 criterion 1). */
const READ_RETRY_DELAYS_MS = [300, 900] as const;

/** The only class that talks HTTP (L2-048). Writes are never retried (L2-042 criterion 2). */
@Injectable()
export class HttpTodoApi extends TodoApi {
  private readonly http = inject(HttpClient);

  list(): Promise<TodoListResponse> {
    return this.send(this.http.get<TodoListResponse>(BASE), { retryReads: true });
  }

  async create(title: string): Promise<Todo> {
    return (await this.send(this.http.post<{ data: Todo }>(BASE, { title }))).data;
  }

  async update(id: string, changes: UpdateTodoPayload): Promise<Todo> {
    return (await this.send(this.http.patch<{ data: Todo }>(`${BASE}/${id}`, changes))).data;
  }

  async delete(id: string): Promise<void> {
    await this.send(this.http.delete<null>(`${BASE}/${id}`));
  }

  async restore(id: string): Promise<Todo> {
    return (await this.send(this.http.post<{ data: Todo }>(`${BASE}/${id}/restore`, {}))).data;
  }

  clearCompleted(): Promise<ClearCompletedResponse> {
    return this.send(this.http.delete<ClearCompletedResponse>(`${BASE}/completed`));
  }

  async restoreMany(ids: readonly string[]): Promise<Todo[]> {
    return (await this.send(this.http.post<{ data: Todo[] }>(`${BASE}/restore`, { ids }))).data;
  }

  private send<T>(request: Observable<T>, options = { retryReads: false }): Promise<T> {
    const attempt = request.pipe(timeout(TIMEOUT_MS), catchError(toApiError));
    return firstValueFrom(options.retryReads ? attempt.pipe(retryTransientFailures()) : attempt);
  }
}

function retryTransientFailures<T>(): MonoTypeOperatorFunction<T> {
  return retry({
    count: READ_RETRY_DELAYS_MS.length,
    delay: (error: unknown, attempt: number) =>
      error instanceof ApiError && error.kind !== 'client'
        ? timer(READ_RETRY_DELAYS_MS[attempt - 1] ?? 0)
        : throwError(() => error),
  });
}

function toApiError(error: unknown): Observable<never> {
  if (error instanceof HttpErrorResponse && error.status !== 0) {
    const kind = error.status >= 500 ? 'server' : 'client';
    return throwError(() => new ApiError(kind, error.status, asProblem(error.error)));
  }
  // Status 0, a timeout, or an abort: no response reached us.
  return throwError(() => new ApiError('network'));
}

function asProblem(body: unknown): ProblemDetails | undefined {
  if (typeof body === 'string') {
    try {
      return asProblem(JSON.parse(body));
    } catch {
      return undefined;
    }
  }
  return typeof body === 'object' && body !== null && 'status' in body
    ? (body as ProblemDetails)
    : undefined;
}
