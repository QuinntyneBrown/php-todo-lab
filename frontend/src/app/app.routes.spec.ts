// Traces to: L2-022
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { InMemoryTodoApi } from '../testing/in-memory-todo-api';
import { routes } from './app.routes';
import { TodoApi } from './core/api/todo-api';

describe('routes', () => {
  it('redirects every unknown path to the one screen at /', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: TodoApi, useValue: new InMemoryTodoApi() }],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/settings/profile');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')).not.toBeNull();
  });
});
