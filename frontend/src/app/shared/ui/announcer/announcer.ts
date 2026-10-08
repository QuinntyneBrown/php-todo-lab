import { Injectable, signal } from '@angular/core';

/**
 * Feeds the one polite live region, which the app shell renders (L2-031). Messages are
 * announced when the user acts; a later rollback is announced by its error toast.
 */
@Injectable({ providedIn: 'root' })
export class Announcer {
  private readonly current = signal('');

  readonly message = this.current.asReadonly();

  announce(message: string): void {
    this.current.set(message);
  }
}
