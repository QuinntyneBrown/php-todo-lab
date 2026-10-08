import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import type { RefusedAdd } from '../../todo.store';
import { UI_STRINGS } from '../../ui-strings';

/** Titles are limited in characters (code points), not UTF-16 units (L2-002). */
const MAX_LENGTH = 200;
const COUNTER_FROM = 160;

/** Code points, as the server counts them with mb_strlen, so 200 emoji fit. */
function codePoints(text: string): string[] {
  return Array.from(text);
}

/** The single field and "Add task" button at the top of the list (L2-001, L2-002). */
@Component({
  selector: 'app-todo-composer',
  templateUrl: './todo-composer.component.html',
  styleUrl: './todo-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoComposerComponent {
  /** Each new value moves focus to the field; the page owns when that happens. */
  readonly focusRequest = input<number | null>(null);
  /** Gives a refused title back, with the server's message if it sent one (L2-004). */
  readonly refused = input<RefusedAdd | null>(null);
  /** Emits the trimmed title; the field is cleared for the next task at once. */
  readonly submitted = output<string>();

  protected readonly strings = UI_STRINGS.composer;
  protected readonly maxLength = MAX_LENGTH;
  /** What the user typed; a refused add puts its title back (L2-004). */
  protected readonly text = linkedSignal(() => this.refused()?.title ?? '');
  protected readonly error = linkedSignal(() => this.refused()?.fieldError ?? null);
  protected readonly length = computed(() => codePoints(this.text()).length);
  protected readonly showCounter = computed(() => this.length() >= COUNTER_FROM);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    effect(() => {
      if (this.focusRequest() !== null) this.field().nativeElement.focus();
    });
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const characters = codePoints(input.value);
    if (characters.length > MAX_LENGTH) {
      input.value = characters.slice(0, MAX_LENGTH).join('');
    }
    this.text.set(input.value);
    this.error.set(null);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const title = this.text().trim();
    if (title === '') {
      this.error.set(this.strings.required);
      return;
    }
    this.submitted.emit(title);
    this.text.set('');
    this.field().nativeElement.focus();
  }
}
