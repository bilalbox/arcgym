import type {
  CauseVerdict,
  HiddenDistractorDTO,
  TroubleshootingDrillDefinition,
} from '../../types/drill.js';

export interface CauseGraderInput {
  drill: TroubleshootingDrillDefinition;
  causeText: string;
}

export interface GradedPassage {
  id: string;
  kind: 'gold' | 'distractor' | 'other';
  text: string;
  rationale: string;
  antipattern?: string;
  score: number;
}

export interface GradeCauseResult {
  verdict: CauseVerdict;
  isCorrect: boolean;
  /** CLEF choice id with the highest probability (`gold`, a distractor id, or `other`). */
  chosenId: string;
  scores: GradedPassage[];
  goldScore: number;
  bestDistractorScore: number;
  otherScore: number;
  matchedDistractor: (HiddenDistractorDTO & { score: number }) | null;
  goldText: string;
  goldRationale: string;
  goldCitationUrl?: string;
}

export interface CauseGrader {
  grade(input: CauseGraderInput): Promise<GradeCauseResult>;
}
