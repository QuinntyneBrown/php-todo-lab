import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UI_STRINGS } from '../../ui-strings';

/** Circumference of the progress ring (r = 20). */
const RING = 2 * Math.PI * 20;

/**
 * The weekday as the page heading, the date in the user's locale (L2-022), and the
 * remaining count with a ring filled by completed over total (L2-007).
 */
@Component({
  selector: 'app-todo-header',
  templateUrl: './todo-header.component.html',
  styleUrl: './todo-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoHeaderComponent {
  readonly date = input.required<Date>();
  readonly activeCount = input(0);
  readonly completedCount = input(0);

  protected readonly strings = UI_STRINGS.header;
  protected readonly ring = RING;
  protected readonly weekday = computed(() =>
    this.date().toLocaleDateString(undefined, { weekday: 'long' }),
  );
  protected readonly dayAndMonth = computed(() =>
    this.date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
  );
  protected readonly allDone = computed(
    () => this.activeCount() === 0 && this.completedCount() > 0,
  );
  protected readonly ringOffset = computed(() => {
    const total = this.activeCount() + this.completedCount();
    return RING * (1 - (total === 0 ? 0 : this.completedCount() / total));
  });
}
