import {
  ChangeDetectionStrategy,
  Component,
  type OnChanges,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Announcer } from '../../../shared/ui/announcer/announcer';
import { ToastComponent } from '../../../shared/ui/toast/toast.component';
import { TodoComposerComponent } from '../components/todo-composer/todo-composer.component';
import {
  type EmptyKind,
  TodoEmptyStateComponent,
} from '../components/todo-empty-state/todo-empty-state.component';
import { TodoFilterComponent } from '../components/todo-filter/todo-filter.component';
import { TodoHeaderComponent } from '../components/todo-header/todo-header.component';
import { type RowFocus, TodoListComponent } from '../components/todo-list/todo-list.component';
import { type RefusedAdd, type TodoFilter, TodoStore, parseFilter } from '../todo.store';
import { UI_STRINGS } from '../ui-strings';
import { TodoShortcutsDirective } from './todo-shortcuts.directive';

/** The one screen (L2-022): header, composer, toolbar, list, and toasts. */
@Component({
  selector: 'app-todo-page',
  imports: [
    TodoHeaderComponent,
    TodoComposerComponent,
    TodoFilterComponent,
    TodoListComponent,
    TodoEmptyStateComponent,
    ToastComponent,
    TodoShortcutsDirective,
  ],
  templateUrl: './todo-page.component.html',
  styleUrl: './todo-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoPageComponent implements OnChanges {
  /** The `?filter=` query parameter, bound by the router (L2-006, L2-047). */
  readonly filter = input<string>();

  protected readonly store = inject(TodoStore);
  private readonly announcer = inject(Announcer);
  private readonly router = inject(Router);
  protected readonly today = new Date();
  protected readonly strings = UI_STRINGS;
  protected readonly composerFocus = signal<number | null>(null);
  protected readonly refusedAdd = signal<RefusedAdd | null>(null);
  protected readonly rowFocus = signal<RowFocus | null>(null);

  /** Why the visible list is empty: no tasks at all, or none for this filter (L2-008). */
  protected readonly emptyKind = computed<EmptyKind>(() =>
    this.store.totalCount() === 0 ? 'none' : this.store.filter() === 'active' ? 'active' : 'done',
  );

  constructor() {
    afterNextRender(() => {
      // Not on touch devices, where the keyboard would cover the list (L2-022 criterion 3).
      if (window.matchMedia('(hover: hover)').matches) this.focusComposer();
    });
  }

  /** Runs on the first navigation and on every back or forward one (filter-tasks design). */
  ngOnChanges(): void {
    this.store.filter.set(parseFilter(this.filter()));
  }

  /** Mirrors the choice into the URL without a reload; All is the bare path. */
  protected select(filter: TodoFilter): void {
    void this.router.navigate([], {
      queryParams: { filter: filter === 'all' ? null : filter },
      queryParamsHandling: 'merge',
    });
  }

  protected async onAdd(title: string): Promise<void> {
    // A new task is active, so the Done view would hide it (L2-001 criterion 5).
    if (this.store.filter() === 'done') this.select('all');
    const added = this.store.add(title);
    this.announce(UI_STRINGS.announcements.added);
    const result = await added;
    if (!result.ok) this.refusedAdd.set(result);
  }

  protected onToggled(id: string, completed: boolean): void {
    void this.store.toggle(id, completed);
    this.announce(
      completed ? UI_STRINGS.announcements.completed : UI_STRINGS.announcements.reopened,
    );
  }

  protected onTitleSaved(id: string, title: string): void {
    if (this.store.saveTitle(id, title)) {
      this.announcer.announce(UI_STRINGS.announcements.updated);
    }
  }

  /** After a keyboard delete, focus goes to the next row, else the previous, else the composer. */
  protected onDelete(id: string, viaKeyboard: boolean): void {
    const neighbour = this.store.neighbourOf(id);
    void this.store.delete(id);
    this.announce(UI_STRINGS.announcements.deleted);
    if (!viaKeyboard) return;
    if (neighbour) this.rowFocus.set({ id: neighbour.id });
    else this.focusComposer();
  }

  protected onClearCompleted(): void {
    const cleared = this.store.completedCount();
    if (cleared === 0) return;
    void this.store.clearCompleted();
    this.announce(UI_STRINGS.toasts.cleared(cleared));
  }

  protected onUndo(): void {
    void this.store.undo();
    this.announce(UI_STRINGS.announcements.restored);
  }

  /** Ctrl/Cmd+Z undoes only while a toast offers Undo (L2-015 criterion 6). */
  protected onUndoShortcut(event: KeyboardEvent): void {
    if (!this.store.toast()?.undo) return;
    event.preventDefault();
    this.onUndo();
  }

  private announce(action: string): void {
    const { activeCount, completedCount } = this.store;
    this.announcer.announce(
      UI_STRINGS.announcements.withCount(action, activeCount(), completedCount()),
    );
  }

  protected focusComposer(): void {
    this.composerFocus.update((n) => (n ?? 0) + 1);
  }
}
