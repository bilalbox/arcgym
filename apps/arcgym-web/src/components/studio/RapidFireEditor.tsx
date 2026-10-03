import type {
  DrillOptionDTO,
  RapidFireDrillDefinition,
  RapidFireStepDTO,
} from '@arcgym/drill-core';
import type React from 'react';
import { OptionEditor } from '@/components/studio/OptionEditor';
import { Button } from '@/components/ui/button';
import { Field, studioFieldClass, studioSectionClass } from '@/studio/fieldStyles';

interface RapidFireEditorProps {
  drill: RapidFireDrillDefinition;
  onChange: (next: RapidFireDrillDefinition) => void;
}

function nextOptionId(stepId: string, options: DrillOptionDTO[]): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (const letter of letters) {
    const id = `${stepId}_${letter}`;
    if (!options.some((o) => o.id === id)) return id;
  }
  return `${stepId}_${options.length + 1}`;
}

export const RapidFireEditor: React.FC<RapidFireEditorProps> = ({ drill, onChange }) => {
  const updateStep = (index: number, step: RapidFireStepDTO) => {
    const steps = drill.steps.slice();
    steps[index] = step;
    onChange({ ...drill, steps });
  };

  const addStep = () => {
    const n = drill.steps.length + 1;
    const id = `s${n}`;
    onChange({
      ...drill,
      steps: [
        ...drill.steps,
        {
          id,
          prompt: '',
          options: [
            {
              id: `${id}_a`,
              label: '',
              isCorrect: true,
              rationale: '',
            },
            {
              id: `${id}_b`,
              label: '',
              isCorrect: false,
              rationale: '',
              distractorAntipattern: '',
            },
          ],
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {drill.steps.map((step, stepIndex) => (
        <div key={step.id} className={studioSectionClass}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-miro-primary">
              Step <span className="font-mono text-xs text-miro-muted">{step.id}</span>
            </span>
            {drill.steps.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({
                    ...drill,
                    steps: drill.steps.filter((_, i) => i !== stepIndex),
                  })
                }
              >
                Remove step
              </Button>
            )}
          </div>
          <Field label="Prompt">
            <textarea
              className={`${studioFieldClass} min-h-[80px]`}
              value={step.prompt}
              onChange={(e) => updateStep(stepIndex, { ...step, prompt: e.target.value })}
            />
          </Field>
          <div className="space-y-3">
            {step.options.map((option, optIndex) => (
              <OptionEditor
                key={option.id}
                option={option}
                canRemove={step.options.length > 2}
                onRemove={() =>
                  updateStep(stepIndex, {
                    ...step,
                    options: step.options.filter((_, i) => i !== optIndex),
                  })
                }
                onChange={(next) => {
                  const options = step.options.slice();
                  options[optIndex] = next;
                  updateStep(stepIndex, { ...step, options });
                }}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              updateStep(stepIndex, {
                ...step,
                options: [
                  ...step.options,
                  {
                    id: nextOptionId(step.id, step.options),
                    label: '',
                    isCorrect: false,
                    rationale: '',
                    distractorAntipattern: '',
                  },
                ],
              })
            }
          >
            Add option
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addStep}>
        Add step
      </Button>
    </div>
  );
};
