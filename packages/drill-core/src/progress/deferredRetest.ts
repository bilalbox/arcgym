import type {
  DeferredRetestSlot,
  DrillAttemptRecord,
  DrillDefinitionDTO,
  RapidFireDrillDefinition,
  VisitorProgressState,
} from '../types/drill.js';
import { isRapidFireDrill } from '../types/drill.js';

export type { DeferredRetestSlot };

/** Inclusive start of the injection window after a hypercorrection miss (calendar days). */
export const DEFERRED_RETEST_MIN_DELAY_DAYS = 2;
/** Inclusive end of the injection window after a hypercorrection miss (calendar days). */
export const DEFERRED_RETEST_MAX_DELAY_DAYS = 5;

/** Matches Hypercorrection Intercept gate (≥85% wrong). */
function isHypercorrectionMiss(confidence: number, isCorrect: boolean): boolean {
  return !isCorrect && confidence >= 0.85;
}

/** Add calendar days to a YYYY-MM-DD string (UTC-noon to avoid DST edge cases). */
export function addCalendarDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDeferredRetestDue(
  slot: DeferredRetestSlot | null | undefined,
  todayDateStr: string,
): boolean {
  if (!slot) return false;
  return todayDateStr >= slot.dueFrom && todayDateStr <= slot.dueUntil;
}

export function isDeferredRetestExpired(
  slot: DeferredRetestSlot | null | undefined,
  todayDateStr: string,
): boolean {
  if (!slot) return false;
  return todayDateStr > slot.dueUntil;
}

/**
 * Deterministic Contrast Set sibling: lowest id among same contrastSetId, excluding source.
 */
export function pickContrastSiblingDrillId(
  catalog: readonly DrillDefinitionDTO[],
  sourceDrillId: string,
  contrastSetId: string,
): string | null {
  const siblings = catalog
    .filter(
      (d): d is RapidFireDrillDefinition =>
        isRapidFireDrill(d) &&
        d.contrastSetId === contrastSetId &&
        d.id !== sourceDrillId &&
        d.status === 'published',
    )
    .map((d) => d.id)
    .sort((a, b) => a.localeCompare(b));
  return siblings[0] ?? null;
}

function attemptIsHypercorrectionMiss(attempt: DrillAttemptRecord): boolean {
  return (attempt.steps ?? []).some((step) =>
    isHypercorrectionMiss(step.confidence, step.isCorrect),
  );
}

function clearResolvedDeferredRetest(
  progress: VisitorProgressState,
  todayDateStr: string,
  justCompletedIds: ReadonlySet<string> = new Set(),
): VisitorProgressState {
  const slot = progress.deferredRetest;
  if (!slot) return progress;

  const completed =
    Boolean(progress.completedDrills[slot.drillId]) || justCompletedIds.has(slot.drillId);
  if (completed || isDeferredRetestExpired(slot, todayDateStr)) {
    const { deferredRetest: _removed, ...rest } = progress;
    return rest;
  }
  return progress;
}

/**
 * After a Rapid Fire round: expire/complete clears the slot; a ≥85% wrong commit
 * may enqueue at most one Deferred Retest against a Contrast Set sibling.
 * `attempts` are treated as just-completed for clear detection (caller owns persistence).
 */
export function applyDeferredRetestAfterRound(
  progress: VisitorProgressState,
  params: {
    attempts: DrillAttemptRecord[];
    catalog: readonly DrillDefinitionDTO[];
    todayDateStr: string;
  },
): VisitorProgressState {
  const { attempts, catalog, todayDateStr } = params;

  const justCompleted = new Set(attempts.map((a) => a.drillId));
  const next = clearResolvedDeferredRetest(progress, todayDateStr, justCompleted);

  if (next.deferredRetest) {
    return next;
  }

  const miss = attempts.find(attemptIsHypercorrectionMiss);
  if (!miss) return next;

  const source = catalog.find((d) => d.id === miss.drillId);
  if (!source || !isRapidFireDrill(source) || !source.contrastSetId) {
    return next;
  }

  const siblingId = pickContrastSiblingDrillId(catalog, miss.drillId, source.contrastSetId);
  if (!siblingId) return next;

  return {
    ...next,
    deferredRetest: {
      drillId: siblingId,
      sourceDrillId: miss.drillId,
      contrastSetId: source.contrastSetId,
      scheduledOn: todayDateStr,
      dueFrom: addCalendarDays(todayDateStr, DEFERRED_RETEST_MIN_DELAY_DAYS),
      dueUntil: addCalendarDays(todayDateStr, DEFERRED_RETEST_MAX_DELAY_DAYS),
    },
  };
}

/**
 * Replace one ordinary recommendation slot with a due Deferred Retest (at most one).
 */
export function injectDeferredRetestIntoRound(params: {
  drills: DrillDefinitionDTO[];
  deferredRetest?: DeferredRetestSlot | null;
  catalog: readonly DrillDefinitionDTO[];
  todayDateStr: string;
}): DrillDefinitionDTO[] {
  const { drills, deferredRetest, catalog, todayDateStr } = params;
  if (!isDeferredRetestDue(deferredRetest, todayDateStr) || !deferredRetest) {
    return drills;
  }

  const retestDrill = catalog.find((d) => d.id === deferredRetest.drillId);
  if (!retestDrill) return drills;

  if (drills.some((d) => d.id === retestDrill.id)) {
    // Already present — keep a single copy at the front.
    const rest = drills.filter((d) => d.id !== retestDrill.id);
    return [retestDrill, ...rest].slice(0, drills.length);
  }

  if (drills.length === 0) return [retestDrill];
  return [retestDrill, ...drills.slice(1)];
}

/** Merge at most one outstanding Deferred Retest (earlier schedule wins). */
export function mergeDeferredRetestSlots(
  local: DeferredRetestSlot | null | undefined,
  cloud: DeferredRetestSlot | null | undefined,
  todayDateStr: string,
  completedDrills: Record<string, DrillAttemptRecord>,
): DeferredRetestSlot | undefined {
  const usable = (slot: DeferredRetestSlot | null | undefined): DeferredRetestSlot | null => {
    if (!slot) return null;
    if (completedDrills[slot.drillId]) return null;
    if (isDeferredRetestExpired(slot, todayDateStr)) return null;
    return slot;
  };

  const l = usable(local);
  const c = usable(cloud);
  if (!l) return c ?? undefined;
  if (!c) return l;
  return l.scheduledOn <= c.scheduledOn ? l : c;
}
