import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The weekday as the page heading and the date beside it, in the user's locale (L2-022). */
@Component({
  selector: 'app-todo-header',
  templateUrl: './todo-header.component.html',
  styleUrl: './todo-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoHeaderComponent {
  readonly date = input.required<Date>();

  protected readonly weekday = computed(() =>
    this.date().toLocaleDateString(undefined, { weekday: 'long' }),
  );
  protected readonly dayAndMonth = computed(() =>
    this.date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
  );
}
