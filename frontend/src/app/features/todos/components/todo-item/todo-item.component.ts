import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterRenderEffect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { TodoView } from '../../todo.store';
import { UI_STRINGS } from '../../ui-strings';

/**
 * One task row: a native checkbox named by the title (L2-029), the title, which edits in
 * place (L2-012), and its controls.
 */
@Component({
  selector: 'app-todo-item',
  templateUrl: './todo-item.component.html',
  styleUrl: './todo-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoItemComponent {
  readonly todo = input.required<TodoView>();
  readonly editing = input(false);
  /** Each new value focuses this row's checkbox; the page owns when (L2-031 criterion 3). */
  readonly focusRequest = input<number | null>(null);
  /** Whether a keyboard activated the delete, so the page can move focus on (L2-031). */
  readonly deleted = output<{ viaKeyboard: boolean }>();
  /** The checked state the user chose. */
  readonly toggled = output<boolean>();
  readonly editStarted = output();
  /** The text the user saved, by Enter or by leaving the field; the store trims it. */
  readonly titleSaved = output<string>();
  readonly editCancelled = output();

  protected readonly strings = UI_STRINGS;
  /** Set only by the user completing the task, so loaded rows never celebrate (L2-011). */
  protected readonly celebrating = signal(false);
  protected readonly editError = signal<string | null>(null);
  private readonly editor = viewChild<ElementRef<HTMLInputElement>>('editor');
  private readonly titleButton = viewChild<ElementRef<HTMLButtonElement>>('titleButton');
  private readonly checkbox = viewChild.required<ElementRef<HTMLInputElement>>('checkbox');
  /** Set when Enter or Escape ends editing, so focus goes back to the title (L2-031). */
  private returnFocus = false;
  /** One edit session ends once, whichever of Enter, Escape, or blur comes first. */
  private ended = false;

  constructor() {
    afterRenderEffect(() => {
      const editor = this.editor()?.nativeElement;
      if (editor && document.activeElement !== editor && !this.ended) {
        editor.focus();
        editor.select();
      }
      const title = this.titleButton()?.nativeElement;
      if (title && this.returnFocus) {
        this.returnFocus = false;
        title.focus();
      }
    });
    afterRenderEffect(() => {
      if (this.focusRequest() !== null) this.checkbox().nativeElement.focus();
    });
  }

  protected onDelete(event: MouseEvent): void {
    // A click from Enter or Space carries no pointer detail.
    this.deleted.emit({ viaKeyboard: event.detail === 0 });
  }

  protected onChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const completed = checkbox.checked;
    // The store decides what is checked; a rollback that lands before the next render
    // would otherwise leave the box showing the user's click.
    checkbox.checked = this.todo().completed;
    this.celebrating.set(completed);
    this.toggled.emit(completed);
  }

  protected startEdit(): void {
    this.ended = false;
    this.editError.set(null);
    this.editStarted.emit();
  }

  protected onEditKey(event: KeyboardEvent): void {
    const editor = event.target as HTMLInputElement;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.end(true);
      this.editCancelled.emit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (editor.value.trim() === '') {
        // Keep editing with the original back and a reason; nothing is sent (L2-013).
        editor.value = this.todo().title;
        editor.select();
        this.editError.set(this.strings.item.titleRequired);
        return;
      }
      this.end(true);
      this.titleSaved.emit(editor.value);
    }
  }

  protected onEditBlur(event: FocusEvent): void {
    if (this.ended) return;
    const value = (event.target as HTMLInputElement).value;
    this.end(false);
    if (value.trim() === '') this.editCancelled.emit();
    else this.titleSaved.emit(value);
  }

  private end(returnFocus: boolean): void {
    this.ended = true;
    this.returnFocus = returnFocus;
    this.editError.set(null);
  }
}
