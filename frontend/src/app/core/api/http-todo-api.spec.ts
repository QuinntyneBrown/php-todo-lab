// Traces to: L2-020, L2-042, L2-048
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ApiError } from './api-error';
import { HttpTodoApi } from './http-todo-api';

/** A stub server: each call to fetch takes the next scripted response. */
function stubServer(...responses: (Response | 'network-error' | 'hang')[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const fetchStub = vi.fn((input: string, init?: RequestInit) => {
    calls.push({
      url: new URL(input, 'http://localhost').pathname,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const next = responses.shift() ?? 'hang';
    if (next === 'network-error') return Promise.reject(new TypeError('Failed to fetch'));
    if (next === 'hang') {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }
    return Promise.resolve(next);
  });
  vi.stubGlobal('fetch', fetchStub);
  return { calls, fetchStub };
}

const json = (status: number, body: unknown, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': type } });
const problem = (status: number, extra: object = {}) =>
  json(
    status,
    { type: 'about:blank', title: 'Error', status, detail: `detail ${String(status)}`, ...extra },
    'application/problem+json',
  );
const list = { data: [], meta: { active: 0, completed: 0 } };

function api(): HttpTodoApi {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), HttpTodoApi],
  });
  return TestBed.inject(HttpTodoApi);
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Expected the promise to reject');
}

describe('HttpTodoApi', () => {
  beforeEach(() => {
    // Only the timers RxJS schedules with; Node's fetch body streams need real setImmediate.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lists todos from GET /api/v1/todos', async () => {
    const server = stubServer(json(200, list));

    await expect(api().list()).resolves.toEqual(list);
    expect(server.calls).toEqual([{ url: '/api/v1/todos', method: 'GET', body: undefined }]);
  });

  it('retries a failed list twice, after 300 ms then 900 ms', async () => {
    const server = stubServer('network-error', problem(503), json(200, list));
    const result = api().list();

    await vi.advanceTimersByTimeAsync(299);
    expect(server.fetchStub).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.fetchStub).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(899);
    expect(server.fetchStub).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual(list);
    expect(server.fetchStub).toHaveBeenCalledTimes(3);
  });

  it('rejects after the third failed list attempt', async () => {
    stubServer(problem(500), problem(500), problem(502));
    const result = rejection(api().list());

    await vi.advanceTimersByTimeAsync(1200);

    const error = await result;
    expect(error.kind).toBe('server');
    expect(error.status).toBe(502);
  });

  it('does not retry a list that fails with a 4xx', async () => {
    const server = stubServer(problem(422));
    const result = rejection(api().list());

    await vi.advanceTimersByTimeAsync(2000);

    expect((await result).kind).toBe('client');
    expect(server.fetchStub).toHaveBeenCalledTimes(1);
  });

  it('never retries a write', async () => {
    const server = stubServer('network-error', json(201, { data: {} }));
    const result = rejection(api().create('Buy oat milk'));

    await vi.advanceTimersByTimeAsync(2000);

    expect((await result).kind).toBe('network');
    expect(server.fetchStub).toHaveBeenCalledTimes(1);
  });

  it('aborts a request with no response after 10 seconds as a network error', async () => {
    stubServer('hang');
    const result = rejection(api().update('01jz0000000000000000000000', { completed: true }));

    await vi.advanceTimersByTimeAsync(10_000);

    expect((await result).kind).toBe('network');
  });

  it('exposes the problem details of a failed request', async () => {
    stubServer(
      problem(422, { code: 'todo_limit_reached', errors: { title: ['You have 500 tasks.'] } }),
    );

    const error = await rejection(api().create('One more'));

    expect(error.kind).toBe('client');
    expect(error.status).toBe(422);
    expect(error.problem?.code).toBe('todo_limit_reached');
    expect(error.fieldError('title')).toBe('You have 500 tasks.');
  });

  it('maps each operation to its endpoint and unwraps data', async () => {
    const todo = {
      id: 'a',
      title: 'T',
      completed: false,
      completedAt: null,
      createdAt: 'x',
      updatedAt: 'x',
    };
    const server = stubServer(
      json(201, { data: todo }),
      json(200, { data: todo }),
      new Response(null, { status: 204 }),
      json(200, { data: todo }),
      json(200, { data: { ids: ['a'] }, meta: { deleted: 1 } }),
      json(200, { data: [todo] }),
    );
    const http = api();

    await expect(http.create('T')).resolves.toEqual(todo);
    await expect(http.update('a', { title: 'U' })).resolves.toEqual(todo);
    await expect(http.delete('a')).resolves.toBeUndefined();
    await expect(http.restore('a')).resolves.toEqual(todo);
    await expect(http.clearCompleted()).resolves.toEqual({
      data: { ids: ['a'] },
      meta: { deleted: 1 },
    });
    await expect(http.restoreMany(['a'])).resolves.toEqual([todo]);

    expect(server.calls).toEqual([
      { url: '/api/v1/todos', method: 'POST', body: { title: 'T' } },
      { url: '/api/v1/todos/a', method: 'PATCH', body: { title: 'U' } },
      { url: '/api/v1/todos/a', method: 'DELETE', body: undefined },
      { url: '/api/v1/todos/a/restore', method: 'POST', body: {} },
      { url: '/api/v1/todos/completed', method: 'DELETE', body: undefined },
      { url: '/api/v1/todos/restore', method: 'POST', body: { ids: ['a'] } },
    ]);
  });
});
