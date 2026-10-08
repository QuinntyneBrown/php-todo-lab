/** What the one toast shows. Error toasts are alerts; others are status messages (L2-031). */
export interface ToastState {
  readonly message: string;
  readonly tone: 'status' | 'error';
  /** The ids an Undo restores, or null when the toast has no Undo. */
  readonly undo: { readonly ids: readonly string[] } | null;
}
