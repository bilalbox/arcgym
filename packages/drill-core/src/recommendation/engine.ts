import {
  type CaseFileDrillDefinition,
  type ClientDrillDefinitionDTO,
  type ClientTroubleshootingDrillDefinition,
  type DrillAttemptRecord,
  type DrillDefinitionDTO,
  isCaseFileDrill,
  isTroubleshootingDrill,
} from '../types/drill.js';

export type DailyWorkoutFormat = 'Case_File' | 'Troubleshooting';

export interface DailyWorkoutAssignment {
  format: DailyWorkoutFormat;
  title: string;
  description: string;
  estimatedMinutes: number;
  isCompletedToday: boolean;
  caseFile?: CaseFileDrillDefinition;
  incident?: ClientTroubleshootingDrillDefinition;
  drillId?: string;
}

/**
 * Hashes an arbitrary string into a stable positive 32-bit integer.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Hashes a date string (e.g. "2026-09-27") into a stable positive 32-bit integer.
 */
export function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Selects today's assigned Daily Drill for a specific learner deterministically.
 * Alternates between Case File and Troubleshooting (Incident), seeded by date + visitor ID.
 */
export function selectDailyWorkout(params: {
  allDrills: (DrillDefinitionDTO | ClientDrillDefinitionDTO)[];
  completedDrills: Record<string, DrillAttemptRecord>;
  todayDateStr: string;
  visitorId: string;
}): DailyWorkoutAssignment | null {
  const { allDrills, completedDrills, todayDateStr, visitorId } = params;

  if (allDrills.length === 0) return null;

  const caseFiles = allDrills.filter(isCaseFileDrill) as CaseFileDrillDefinition[];
  const incidents = allDrills.filter(
    isTroubleshootingDrill,
  ) as ClientTroubleshootingDrillDefinition[];

  const availableFormats: DailyWorkoutFormat[] = [];
  if (caseFiles.length > 0) availableFormats.push('Case_File');
  if (incidents.length > 0) availableFormats.push('Troubleshooting');

  if (availableFormats.length === 0) return null;

  // Deterministic seed based on date and visitor ID
  const userDailySeed = hashString(`${todayDateStr}:${visitorId || 'guest'}`);
  const formatIndex = userDailySeed % availableFormats.length;
  const format = availableFormats[formatIndex];

  if (format === 'Case_File') {
    const uncompletedCases = caseFiles.filter((c) => !completedDrills[c.id]);
    const pool = uncompletedCases.length > 0 ? uncompletedCases : caseFiles;
    const caseIndex = userDailySeed % pool.length;
    const assignedCase = pool[caseIndex];

    const attempt = completedDrills[assignedCase.id];
    const isCompletedToday = Boolean(attempt && attempt.completedAt.slice(0, 10) === todayDateStr);

    return {
      format: 'Case_File',
      title: assignedCase.title,
      description:
        assignedCase.brief?.synopsis ||
        'Enterprise narrative Brief with scarce Probe Budget across stations.',
      estimatedMinutes: 10,
      isCompletedToday,
      caseFile: assignedCase,
      drillId: assignedCase.id,
    };
  }

  // Troubleshooting
  const uncompletedIncidents = incidents.filter((inc) => !completedDrills[inc.id]);
  const pool = uncompletedIncidents.length > 0 ? uncompletedIncidents : incidents;
  const incidentIndex = userDailySeed % pool.length;
  const assignedIncident = pool[incidentIndex];

  const attempt = completedDrills[assignedIncident.id];
  const isCompletedToday = Boolean(attempt && attempt.completedAt.slice(0, 10) === todayDateStr);

  return {
    format: 'Troubleshooting',
    title: assignedIncident.title,
    description:
      assignedIncident.issue ||
      'Diagnose architectural failure from system topology diagram and scarce probes.',
    estimatedMinutes: 8,
    isCompletedToday,
    incident: assignedIncident,
    drillId: assignedIncident.id,
  };
}
