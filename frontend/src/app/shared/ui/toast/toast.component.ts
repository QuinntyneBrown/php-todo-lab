import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ToastState } from './toast-state';

/** The single toast at the bottom of the screen. */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly toast = input.required<ToastState>();
}
