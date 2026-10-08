import { Directive, output } from '@angular/core';

/** Where a typed `/` is text rather than the composer shortcut (L2-023 criterion 1). */
const TEXT_ENTRY = 'textarea, [contenteditable], input:not([type=checkbox], [type=radio])';

/**
 * The page's document-wide keys: `/` asks for the composer outside text fields (L2-023),
 * and Ctrl/Cmd+Z asks for Undo (L2-015). The page decides whether Undo applies.
 */
@Directive({
  selector: '[appTodoShortcuts]',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class TodoShortcutsDirective {
  readonly composerShortcut = output();
  readonly undoShortcut = output<KeyboardEvent>();

  protected onKeydown(event: KeyboardEvent): void {
    const typing = event.target instanceof HTMLElement && event.target.matches(TEXT_ENTRY);
    if (event.key === '/' && !typing) {
      event.preventDefault();
      this.composerShortcut.emit();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      this.undoShortcut.emit(event);
    }
  }
}
