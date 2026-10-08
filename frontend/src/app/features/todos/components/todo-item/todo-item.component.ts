import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TodoView } from '../../todo.store';

/** One task row: native checkbox named by the title, then the title (L2-029). */
@Component({
  selector: 'app-todo-item',
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoItemComponent {
  readonly todo = input.required<TodoView>();
}
