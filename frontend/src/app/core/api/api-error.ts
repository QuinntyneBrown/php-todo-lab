import type { ProblemDetails } from './models';

/** Network: no response (offline, aborted, timed out). Server: 5xx. Client: 4xx. */
export type FailureKind = 'network' | 'server' | 'client';

/** The one error type the TodoApi port rejects with; components never see HTTP. */
export class ApiError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly status?: number,
    readonly problem?: ProblemDetails,
  ) {
    super(problem?.detail ?? `Request failed (${kind}${status ? ` ${String(status)}` : ''})`);
    this.name = 'ApiError';
  }

  /** The first server message for a field, for showing at that field. */
  fieldError(field: string): string | undefined {
    return this.problem?.errors?.[field]?.[0];
  }
}
