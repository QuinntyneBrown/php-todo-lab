import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UI_STRINGS } from '../../ui-strings';

export type EmptyKind = keyof typeof UI_STRINGS.emptyStates;

/** What an empty list says, by why it is empty (L2-008). */
@Component({
  selector: 'app-todo-empty-state',
  templateUrl: './todo-empty-state.component.html',
  styleUrl: './todo-empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoEmptyStateComponent {
  readonly kind = input.required<EmptyKind>();

  protected readonly copy = computed(() => UI_STRINGS.emptyStates[this.kind()]);
}
