/** In-app navigation blocker for unsaved studio edits. */

type Blocker = () => boolean;

let blocker: Blocker | null = null;

/** Register a predicate that returns true if navigation may proceed. */
export function setStudioNavBlocker(next: Blocker | null): void {
  blocker = next;
}

export function allowStudioNavigation(): boolean {
  return blocker ? blocker() : true;
}
