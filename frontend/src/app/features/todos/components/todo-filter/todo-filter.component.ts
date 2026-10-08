import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TodoFilter } from '../../todo.store';
import { UI_STRINGS } from '../../ui-strings';

/** The All / Active / Done segmented control, each with its count (L2-006, L2-007). */
@Component({
  selector: 'app-todo-filter',
  templateUrl: './todo-filter.component.html',
  styleUrl: './todo-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoFilterComponent {
  readonly selected = input.required<TodoFilter>();
  readonly allCount = input(0);
  readonly activeCount = input(0);
  readonly doneCount = input(0);
  readonly selectedChange = output<TodoFilter>();

  protected readonly label = UI_STRINGS.filters.groupLabel;
  protected readonly options = computed(() => [
    { value: 'all' as const, name: UI_STRINGS.filters.all, count: this.allCount() },
    { value: 'active' as const, name: UI_STRINGS.filters.active, count: this.activeCount() },
    { value: 'done' as const, name: UI_STRINGS.filters.done, count: this.doneCount() },
  ]);
}
