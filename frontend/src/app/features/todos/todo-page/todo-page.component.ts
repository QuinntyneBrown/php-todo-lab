import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { TodoComposerComponent } from '../components/todo-composer/todo-composer.component';
import { TodoHeaderComponent } from '../components/todo-header/todo-header.component';
import { UI_STRINGS } from '../ui-strings';

/** The one screen (L2-022): header, composer, toolbar, list, and toasts. */
@Component({
  selector: 'app-todo-page',
  imports: [TodoHeaderComponent, TodoComposerComponent],
  templateUrl: './todo-page.component.html',
  styleUrl: './todo-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoPageComponent {
  protected readonly today = new Date();
  protected readonly strings = UI_STRINGS;
  protected readonly composerFocus = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      // Not on touch devices, where the keyboard would cover the list (L2-022 criterion 3).
      if (window.matchMedia('(hover: hover)').matches) this.focusComposer();
    });
  }

  private focusComposer(): void {
    this.composerFocus.update((n) => (n ?? 0) + 1);
  }
}
