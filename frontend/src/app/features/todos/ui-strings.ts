/**
 * Every user-facing string, in one typed place for review and later localisation
 * (L2-025). Plain, active, sentence case; errors say what happened and what to do.
 */
export const UI_STRINGS = {
  composer: {
    label: 'New task',
    placeholder: 'What needs doing?',
    submit: 'Add task',
    required: 'Enter a task title.',
  },
  header: {
    left: 'left',
    allDone: 'All done',
  },
  filters: {
    groupLabel: 'Show tasks',
    all: 'All',
    active: 'Active',
    done: 'Done',
    clearCompleted: 'Clear completed',
  },
  emptyStates: {
    none: { title: 'Nothing here yet', text: 'Type a task above and press Enter.' },
    active: { title: 'All clear', text: 'Nothing left to do.' },
    done: { title: 'Nothing completed yet', text: 'Tick a task and it will show up here.' },
  },
  list: {
    label: 'Tasks',
    loadFailed: "Couldn't load your tasks. Check your connection and try again.",
    retry: 'Try again',
  },
  item: {
    editLabel: 'Edit task title',
    titleRequired: 'A task needs a title.',
  },
  toasts: {
    undo: 'Undo',
    deleted: 'Task deleted',
    cleared: (n: number) => `${String(n)} ${n === 1 ? 'task' : 'tasks'} cleared`,
    addFailed: "Couldn't add that task. Try again.",
    updateFailed: "Couldn't update that task.",
    saveFailed: "Couldn't save that change.",
    deleteFailed: "Couldn't delete that task.",
    clearFailed: "Couldn't clear completed tasks.",
    restoreFailed: "Couldn't restore that task.",
    restoreManyFailed: "Couldn't restore those tasks.",
    gone: 'That task no longer exists.',
  },
  announcements: {
    added: 'Task added',
    completed: 'Task completed',
    reopened: 'Task reopened',
    updated: 'Task updated',
    deleted: 'Task deleted',
    restored: 'Task restored',
    /** An action with the count it leaves, as one message so neither interrupts (L2-007). */
    withCount: (action: string, active: number, completed: number) =>
      `${action}. ${active === 0 && completed > 0 ? 'All done' : `${String(active)} left`}`,
  },
  ariaLabels: {
    edit: (title: string) => `Edit ${title}`,
    delete: (title: string) => `Delete ${title}`,
    filter: (name: string, count: number) => `${name}, ${String(count)}`,
  },
  offline: "You're offline. Changes will fail until you reconnect.",
} as const;
