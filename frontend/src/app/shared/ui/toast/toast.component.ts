import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import type { ToastState } from './toast-state';

/** How long a toast stays when nobody is interacting with it (L2-015 criterion 3). */
const DISMISS_AFTER_MS = 6000;

/**
 * The single toast at the bottom of the screen. It never takes focus, and it waits while
 * the pointer or focus is on it, then gives a full 6 seconds again (L2-031 criterion 5).
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusin)': 'hold()',
    '(focusout)': 'arm()',
    '(mouseenter)': 'hold()',
    '(mouseleave)': 'arm()',
  },
})
export class ToastComponent {
  readonly toast = input.required<ToastState>();
  readonly undoLabel = input('Undo');
  readonly undone = output();
  readonly dismissed = output();

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Restarting the timer is a side effect outside Angular, the one use of effect (L2-047).
    effect(() => {
      this.toast();
      this.arm();
    });
    inject(DestroyRef).onDestroy(() => {
      this.hold();
    });
  }

  protected hold(): void {
    clearTimeout(this.timer);
  }

  protected arm(): void {
    this.hold();
    this.timer = setTimeout(() => {
      this.dismissed.emit();
    }, DISMISS_AFTER_MS);
  }
}
