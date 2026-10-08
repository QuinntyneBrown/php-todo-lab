import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
  /** The checked state the user chose. */
  readonly toggled = output<boolean>();

  /** Set only by the user completing the task, so loaded rows never celebrate (L2-011). */
  protected readonly celebrating = signal(false);

  protected onChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const completed = checkbox.checked;
    // The store decides what is checked; a rollback that lands before the next render
    // would otherwise leave the box showing the user's click.
    checkbox.checked = this.todo().completed;
    this.celebrating.set(completed);
    this.toggled.emit(completed);
  }
}
