import type {
  HiddenDistractorDTO,
  ProbeOptionDTO,
  ProbeTier,
  TroubleshootingDrillDefinition,
  TroubleshootingFixOption,
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

  const removeProbe = (index: number) => {
    const probes = drill.probes.filter((_, i) => i !== index);
    onChange({ ...drill, probes });
  };

  const addProbe = () => {
    const probes = [
      ...drill.probes,
      {
        id: nextProbeId(drill.probes),
        label: '',
        tier: 'useful' as ProbeTier,
        answer: '',
      },
    ];
    onChange({ ...drill, probes });
  };

  const updateDistractor = (index: number, distractor: HiddenDistractorDTO) => {
    const hiddenDistractors = drill.hiddenDistractors.slice();
    hiddenDistractors[index] = distractor;
    onChange({ ...drill, hiddenDistractors });
  };

  const currentFix = drill.fix ?? {
    prompt: 'Select the architectural remediation:',
    options: [
      { id: 'fix_gold', label: '', rationale: '', isCorrect: true, citationUrl: '' },
      { id: 'fix_d1', label: '', rationale: '', isCorrect: false, distractorAntipattern: '' },
      { id: 'fix_d2', label: '', rationale: '', isCorrect: false, distractorAntipattern: '' },
    ],
  };

  const updateFixOption = (index: number, option: TroubleshootingFixOption) => {
    const nextOptions = [...currentFix.options];
    nextOptions[index] = option;
    onChange({
      ...drill,
      fix: {
        ...currentFix,
        options: nextOptions,
      },
    });
  };

  const updateFixPrompt = (prompt: string) => {
    onChange({
      ...drill,
      fix: {
        ...currentFix,
        prompt,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className={studioSectionClass}>
        <h3 className="text-sm font-medium text-miro-primary mb-2">Architecture</h3>
        <Field label="Synopsis">
          <textarea
            className={`${studioFieldClass} min-h-[80px]`}
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
        <Field label="Diagram label (optional)">
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
      </div>

      <div className={studioSectionClass}>
        <h3 className="text-sm font-medium text-miro-primary mb-2">Issue</h3>
        <textarea
          className={`${studioFieldClass} min-h-[80px]`}
          value={drill.issue}
          onChange={(e) => onChange({ ...drill, issue: e.target.value })}
        />
        <div className="mt-3">
          <Field label="Probe budget">
            <input
              type="number"
              className={`${studioFieldClass} max-w-[6rem]`}
              value={drill.probeBudget}
              onChange={(e) => onChange({ ...drill, probeBudget: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
      </div>

      <div className={studioSectionClass}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-miro-primary">Probes</h3>
          <Button type="button" size="sm" variant="secondary" onClick={addProbe}>
            Add probe
          </Button>
        </div>
        <div className="space-y-3">
          {drill.probes.map((p, index) => (
            <div key={p.id} className="rounded-md border border-miro-hairline p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  className={`${studioFieldClass} max-w-[6rem] font-mono text-xs`}
                  value={p.id}
                  onChange={(e) => updateProbe(index, { ...p, id: e.target.value })}
                />
                <select
                  className={studioFieldClass}
                  value={p.tier}
                  onChange={(e) => updateProbe(index, { ...p, tier: e.target.value as ProbeTier })}
                >
                  {PROBE_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeProbe(index)}
                >
                  Remove
                </Button>
              </div>
              <input
                type="text"
                className={studioFieldClass}
                placeholder="Question / label"
                value={p.label}
                onChange={(e) => updateProbe(index, { ...p, label: e.target.value })}
              />
              <textarea
                className={`${studioFieldClass} min-h-[60px]`}
                placeholder="Answer (finding)"
                value={p.answer}
                onChange={(e) => updateProbe(index, { ...p, answer: e.target.value })}
              />
              {p.tier === 'distractor' && (
                <input
                  type="text"
                  className={studioFieldClass}
                  placeholder="Distractor antipattern"
                  value={p.distractorAntipattern ?? ''}
                  onChange={(e) =>
                    updateProbe(index, {
                      ...p,
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
            className={`${studioFieldClass} min-h-[60px]`}
            value={drill.goldCause.text}
            onChange={(e) =>
              onChange({
                ...drill,
                goldCause: { ...drill.goldCause, text: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Rationale">
          <textarea
            className={`${studioFieldClass} min-h-[60px]`}
            value={drill.goldCause.rationale}
            onChange={(e) =>
              onChange({
                ...drill,
                goldCause: { ...drill.goldCause, rationale: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Citation URL (optional)">
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
        <h3 className="text-sm font-medium text-miro-primary mb-2">
          Architectural Fix (3 Options: 1 Gold + 2 Distractors)
        </h3>
        <Field label="Fix Prompt">
          <input
            type="text"
            className={studioFieldClass}
            placeholder="e.g. Select the architectural remediation:"
            value={currentFix.prompt}
            onChange={(e) => updateFixPrompt(e.target.value)}
          />
        </Field>
        <div className="space-y-3 mt-3">
          {currentFix.options.map((opt, index) => (
            <div
              key={opt.id || index}
              className="rounded-md border border-miro-hairline p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-miro-slate">
                  Option {index + 1} {opt.isCorrect ? '(Gold Cited)' : '(Distractor Antipattern)'}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-miro-slate">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={(e) => {
                      updateFixOption(index, { ...opt, isCorrect: e.target.checked });
                    }}
                  />
                  isCorrect
                </label>
              </div>
              <input
                type="text"
                className={studioFieldClass}
                placeholder="Option label"
                value={opt.label}
                onChange={(e) => updateFixOption(index, { ...opt, label: e.target.value })}
              />
              <textarea
                className={`${studioFieldClass} min-h-[60px]`}
                placeholder="Rationale"
                value={opt.rationale}
                onChange={(e) => updateFixOption(index, { ...opt, rationale: e.target.value })}
              />
              {opt.isCorrect ? (
                <input
                  type="text"
                  className={studioFieldClass}
                  placeholder="Citation URL"
                  value={opt.citationUrl ?? ''}
                  onChange={(e) =>
                    updateFixOption(index, {
                      ...opt,
                      citationUrl: e.target.value || undefined,
                    })
                  }
                />
              ) : (
                <input
                  type="text"
                  className={studioFieldClass}
                  placeholder="Distractor Antipattern"
                  value={opt.distractorAntipattern ?? ''}
                  onChange={(e) =>
                    updateFixOption(index, {
                      ...opt,
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
