import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { UI_STRINGS } from '../../ui-strings';

/** The single field and "Add task" button at the top of the list (L2-001). */
@Component({
  selector: 'app-todo-composer',
  templateUrl: './todo-composer.component.html',
  styleUrl: './todo-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoComposerComponent {
  /** Each new value moves focus to the field; the page owns when that happens. */
  readonly focusRequest = input<number | null>(null);

  protected readonly strings = UI_STRINGS.composer;
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    effect(() => {
      if (this.focusRequest() !== null) this.field().nativeElement.focus();
    });
  }
}
