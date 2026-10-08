import type { Routes } from '@angular/router';
import { TodoPageComponent } from './features/todos/todo-page/todo-page.component';

/** One screen; every other path leads back to it (L2-022 criterion 1). */
export const routes: Routes = [
  { path: '', component: TodoPageComponent },
  { path: '**', redirectTo: '' },
];
