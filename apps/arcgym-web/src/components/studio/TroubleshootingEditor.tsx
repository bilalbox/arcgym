import type {
  HiddenDistractorDTO,
  ProbeOptionDTO,
  ProbeTier,
  TroubleshootingDrillDefinition,
} from '@arcgym/drill-core';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Field, studioFieldClass, studioSectionClass } from '@/studio/fieldStyles';

const PROBE_TIERS: ProbeTier[] = ['pivotal', 'useful', 'distractor'];

interface TroubleshootingEditorProps {
  drill: TroubleshootingDrillDefinition;
  onChange: (next: TroubleshootingDrillDefinition) => void;
}

function nextProbeId(probes: ProbeOptionDTO[]): string {
  let n = probes.length + 1;
  while (probes.some((p) => p.id === `p${n}`)) n += 1;
  return `p${n}`;
}

export const TroubleshootingEditor: React.FC<TroubleshootingEditorProps> = ({
  drill,
  onChange,
}) => {
  const updateProbe = (index: number, probe: ProbeOptionDTO) => {
    const probes = drill.probes.slice();
    probes[index] = probe;
    onChange({ ...drill, probes });
  };

  const updateDistractor = (index: number, distractor: HiddenDistractorDTO) => {
    const hiddenDistractors = drill.hiddenDistractors.slice();
    hiddenDistractors[index] = distractor;
    onChange({ ...drill, hiddenDistractors });
  };

  return (
    <div className="space-y-4">
      <div className={studioSectionClass}>
        <Field label="Architecture synopsis">
          <textarea
            className={`${studioFieldClass} min-h-[100px]`}
            value={drill.architecture.synopsis}
            onChange={(e) =>
              onChange({
                ...drill,
                architecture: { ...drill.architecture, synopsis: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Diagram URL">
          <input
            type="text"
            className={studioFieldClass}
            value={drill.architecture.diagramUrl}
            onChange={(e) =>
              onChange({
                ...drill,
                architecture: { ...drill.architecture, diagramUrl: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Diagram label">
          <input
            type="text"
            className={studioFieldClass}
            value={drill.architecture.diagramLabel ?? ''}
            onChange={(e) =>
              onChange({
                ...drill,
                architecture: {
                  ...drill.architecture,
                  diagramLabel: e.target.value || undefined,
                },
              })
            }
          />
        </Field>
        <Field label="Issue">
          <textarea
            className={`${studioFieldClass} min-h-[80px]`}
            value={drill.issue}
            onChange={(e) => onChange({ ...drill, issue: e.target.value })}
          />
        </Field>
        <Field label="Probe budget">
          <input
            type="number"
            min={1}
            className={studioFieldClass}
            value={drill.probeBudget}
            onChange={(e) => onChange({ ...drill, probeBudget: Number(e.target.value) || 3 })}
          />
        </Field>
      </div>

      <div className={studioSectionClass}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-miro-primary">Probes</h3>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              onChange({
                ...drill,
                probes: [
                  ...drill.probes,
                  {
                    id: nextProbeId(drill.probes),
                    label: '',
                    tier: 'useful',
                    answer: '',
                  },
                ],
              })
            }
          >
            Add probe
          </Button>
        </div>
        <div className="space-y-3">
          {drill.probes.map((probe, index) => (
            <div key={probe.id} className="rounded-md border border-miro-hairline p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  className={`${studioFieldClass} max-w-[8rem] font-mono text-xs`}
                  value={probe.id}
                  onChange={(e) => updateProbe(index, { ...probe, id: e.target.value })}
                />
                <select
                  className={studioFieldClass}
                  value={probe.tier}
                  onChange={(e) =>
                    updateProbe(index, { ...probe, tier: e.target.value as ProbeTier })
                  }
                >
                  {PROBE_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                className={studioFieldClass}
                placeholder="Clarifying question?"
                value={probe.label}
                onChange={(e) => updateProbe(index, { ...probe, label: e.target.value })}
              />
              <textarea
                className={`${studioFieldClass} min-h-[60px]`}
                placeholder="Scenario fact answer"
                value={probe.answer}
                onChange={(e) => updateProbe(index, { ...probe, answer: e.target.value })}
              />
              {probe.tier === 'distractor' && (
                <input
                  type="text"
                  className={studioFieldClass}
                  placeholder="Antipattern name"
                  value={probe.distractorAntipattern ?? ''}
                  onChange={(e) =>
                    updateProbe(index, {
                      ...probe,
                      distractorAntipattern: e.target.value || undefined,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={studioSectionClass}>
        <h3 className="text-sm font-medium text-miro-primary mb-2">Gold cause</h3>
        <Field label="Text">
          <textarea
            className={`${studioFieldClass} min-h-[70px]`}
            value={drill.goldCause.text}
            onChange={(e) =>
              onChange({ ...drill, goldCause: { ...drill.goldCause, text: e.target.value } })
            }
          />
        </Field>
        <Field label="Rationale">
          <textarea
            className={`${studioFieldClass} min-h-[70px]`}
            value={drill.goldCause.rationale}
            onChange={(e) =>
              onChange({
                ...drill,
                goldCause: { ...drill.goldCause, rationale: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Citation URL">
          <input
            type="text"
            className={studioFieldClass}
            value={drill.goldCause.citationUrl ?? ''}
            onChange={(e) =>
              onChange({
                ...drill,
                goldCause: {
                  ...drill.goldCause,
                  citationUrl: e.target.value || undefined,
                },
              })
            }
          />
        </Field>
      </div>

      <div className={studioSectionClass}>
        <h3 className="text-sm font-medium text-miro-primary mb-2">Hidden distractors</h3>
        <div className="space-y-3">
          {drill.hiddenDistractors.map((d, index) => (
            <div key={d.id} className="rounded-md border border-miro-hairline p-3 space-y-2">
              <input
                type="text"
                className={`${studioFieldClass} max-w-[8rem] font-mono text-xs`}
                value={d.id}
                onChange={(e) => updateDistractor(index, { ...d, id: e.target.value })}
              />
              <textarea
                className={`${studioFieldClass} min-h-[60px]`}
                placeholder="Distractor cause text"
                value={d.text}
                onChange={(e) => updateDistractor(index, { ...d, text: e.target.value })}
              />
              <input
                type="text"
                className={studioFieldClass}
                placeholder="Antipattern"
                value={d.antipattern}
                onChange={(e) => updateDistractor(index, { ...d, antipattern: e.target.value })}
              />
              <textarea
                className={`${studioFieldClass} min-h-[60px]`}
                placeholder="Rationale"
                value={d.rationale}
                onChange={(e) => updateDistractor(index, { ...d, rationale: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
