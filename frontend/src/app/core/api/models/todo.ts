/** A todo exactly as the v1 API serialises it (L2-019). Timestamps are ISO-8601 UTC. */
export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Counts across every non-deleted todo, whatever the filter (L2-005). */
export interface TodoListMeta {
  readonly active: number;
  readonly completed: number;
}

export interface TodoListResponse {
  readonly data: readonly Todo[];
  readonly meta: TodoListMeta;
}

/** Any non-empty subset of the editable fields (L2-014). */
export interface UpdateTodoPayload {
  readonly title?: string;
  readonly completed?: boolean;
}

export interface ClearCompletedResponse {
  readonly data: { readonly ids: readonly string[] };
  readonly meta: { readonly deleted: number };
}

/** RFC 9457 problem details, as every API error is rendered (L2-020). */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}
