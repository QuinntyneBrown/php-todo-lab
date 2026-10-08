import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Whether the browser believes it is online, kept current by its online/offline events. */
@Injectable({ providedIn: 'root' })
export class Connectivity {
  private readonly state = signal(navigator.onLine);

  readonly online = this.state.asReadonly();

  constructor() {
    const update = (): void => {
      this.state.set(navigator.onLine);
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
