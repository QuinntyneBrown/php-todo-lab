import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { Announcer } from '../../../shared/ui/announcer/announcer';
import { ToastComponent } from '../../../shared/ui/toast/toast.component';
import {
  type ComposerRestore,
  TodoComposerComponent,
} from '../components/todo-composer/todo-composer.component';
import { TodoEmptyStateComponent } from '../components/todo-empty-state/todo-empty-state.component';
import { TodoHeaderComponent } from '../components/todo-header/todo-header.component';
import { TodoListComponent } from '../components/todo-list/todo-list.component';
import { TodoStore } from '../todo.store';
import { UI_STRINGS } from '../ui-strings';

/** The one screen (L2-022): header, composer, toolbar, list, and toasts. */
@Component({
  selector: 'app-todo-page',
  imports: [
    TodoHeaderComponent,
    TodoComposerComponent,
    TodoListComponent,
    TodoEmptyStateComponent,
    ToastComponent,
  ],
  templateUrl: './todo-page.component.html',
  styleUrl: './todo-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoPageComponent {
  protected readonly store = inject(TodoStore);
  private readonly announcer = inject(Announcer);
  protected readonly today = new Date();
  protected readonly strings = UI_STRINGS;
  protected readonly composerFocus = signal<number | null>(null);
  protected readonly composerRestore = signal<ComposerRestore | null>(null);

  constructor() {
    afterNextRender(() => {
      // Not on touch devices, where the keyboard would cover the list (L2-022 criterion 3).
      if (window.matchMedia('(hover: hover)').matches) this.focusComposer();
    });
  }

  protected async onAdd(title: string): Promise<void> {
    const added = this.store.add(title);
    this.announce(UI_STRINGS.announcements.added);
    const result = await added;
    if (!result.ok) {
      this.composerRestore.update((previous) => ({
        text: result.title,
        error: result.fieldError ?? null,
        seq: (previous?.seq ?? 0) + 1,
      }));
    }
  }

  /** One message with the action and the new count, so neither interrupts the other (L2-007). */
  private announce(action: string): void {
    const count =
      this.store.activeCount() === 0 && this.store.completedCount() > 0
        ? UI_STRINGS.announcements.allDone
        : UI_STRINGS.announcements.remaining(this.store.activeCount());
    this.announcer.announce(`${action}. ${count}`);
  }

  private focusComposer(): void {
    this.composerFocus.update((n) => (n ?? 0) + 1);
  }
}
