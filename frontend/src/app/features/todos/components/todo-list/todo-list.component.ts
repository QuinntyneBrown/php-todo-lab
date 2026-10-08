import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TodoView } from '../../todo.store';
import { UI_STRINGS } from '../../ui-strings';
import { TodoItemComponent } from '../todo-item/todo-item.component';

export interface RowFocus {
  readonly id: string;
  readonly seq: number;
}

/** The task rows, or three skeleton rows while the list loads (L2-008). */
@Component({
  selector: 'app-todo-list',
  imports: [TodoItemComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoListComponent {
  readonly todos = input.required<readonly TodoView[]>();
  readonly loading = input(false);
  readonly editingId = input<string | null>(null);
  /** Moves focus to one row's checkbox; a new `seq` repeats the move (L2-031). */
  readonly rowFocus = input<RowFocus | null>(null);
  readonly toggled = output<{ id: string; completed: boolean }>();
  readonly editStarted = output<string>();
  readonly titleSaved = output<{ id: string; title: string }>();
  readonly editCancelled = output();
  readonly deleted = output<{ id: string; viaKeyboard: boolean }>();

  protected readonly label = UI_STRINGS.list.label;
}
