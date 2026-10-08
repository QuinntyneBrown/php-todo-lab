import { type Page, type Route, test as base, expect } from '@playwright/test';
import { ApiError } from '../../src/app/core/api/api-error';
import { InMemoryTodoApi } from '../../src/testing/in-memory-todo-api';

/**
 * Serves `/api/v1` from an InMemoryTodoApi inside the test, so the SPA runs without the
 * backend (independent tiers) and each test controls the data, failures, and timing.
 */
export const test = base.extend<{ api: InMemoryTodoApi }>({
  api: async ({ page }, use) => {
    const api = new InMemoryTodoApi();
    await page.route('**/api/v1/**', (route) => serve(api, route));
    await use(api);
  },
});

export { expect };

interface Reply {
  readonly status: number;
  readonly body?: unknown;
}

async function serve(api: InMemoryTodoApi, route: Route): Promise<void> {
  try {
    const reply = await answer(api, route);
    await route.fulfill({
      status: reply.status,
      contentType: 'application/json',
      body: reply.body === undefined ? '' : JSON.stringify(reply.body),
    });
  } catch (error) {
    if (error instanceof ApiError && error.kind !== 'network' && error.status !== undefined) {
      await route.fulfill({
        status: error.status,
        contentType: 'application/problem+json',
        body: JSON.stringify(error.problem ?? { status: error.status }),
      });
    } else {
      await route.abort('failed');
    }
  }
}

/** Maps one request onto the fake, as the Laravel routes would (L2-018). */
async function answer(api: InMemoryTodoApi, route: Route): Promise<Reply> {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, '');
  const method = request.method();
  const body = (request.postData() ? request.postDataJSON() : {}) as Record<string, unknown>;
  const id = /^\/todos\/([^/]+)/.exec(path)?.[1] ?? '';

  if (method === 'GET' && path === '/todos') return { status: 200, body: await api.list() };
  if (method === 'POST' && path === '/todos') {
    return { status: 201, body: { data: await api.create(String(body['title'])) } };
  }
  if (method === 'DELETE' && path === '/todos/completed') {
    return { status: 200, body: await api.clearCompleted() };
  }
  if (method === 'POST' && path === '/todos/restore') {
    return { status: 200, body: { data: await api.restoreMany(body['ids'] as string[]) } };
  }
  if (method === 'PATCH') return { status: 200, body: { data: await api.update(id, body) } };
  if (method === 'DELETE') {
    await api.delete(id);
    return { status: 204 };
  }
  if (method === 'POST' && path.endsWith('/restore')) {
    return { status: 200, body: { data: await api.restore(id) } };
  }
  return { status: 404 };
}

/** Opens the app and waits until the list has loaded. */
export async function open(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('skeleton')).toHaveCount(0);
}
