/**
 * Fakes window.matchMedia (jsdom has none). Queries listed in `matches` match;
 * every other query does not.
 */
export function fakeMedia(...matches: string[]): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches.includes(query),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}
