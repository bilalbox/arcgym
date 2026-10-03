import type { DrillOptionDTO } from '@arcgym/drill-core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CitationPicker } from '@/components/studio/CitationPicker';
import { Button } from '@/components/ui/button';
import { checkDiagramExists } from '@/studio/api';
import { Field, studioFieldClass, studioSectionClass } from '@/studio/fieldStyles';

interface OptionEditorProps {
  option: DrillOptionDTO;
  onChange: (next: DrillOptionDTO) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const OptionEditor: React.FC<OptionEditorProps> = ({
  option,
  onChange,
  onRemove,
  canRemove,
}) => {
  const [diagramOk, setDiagramOk] = useState<boolean | null>(null);

  useEffect(() => {
    const path = option.diagramUrl?.trim() ?? '';
    if (!path) {
      setDiagramOk(null);
      return;
    }
    let cancelled = false;
    checkDiagramExists(path)
      .then((r) => {
        if (!cancelled) setDiagramOk(r.exists);
      })
      .catch(() => {
        if (!cancelled) setDiagramOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [option.diagramUrl]);

  return (
    <div className={studioSectionClass}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-miro-muted">{option.id}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <Field label="Label">
        <textarea
          className={`${studioFieldClass} min-h-[60px]`}
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
        />
      </Field>
      <label className="inline-flex items-center gap-2 text-sm text-miro-primary cursor-pointer">
        <input
          type="checkbox"
          checked={option.isCorrect}
          onChange={(e) => onChange({ ...option, isCorrect: e.target.checked })}
        />
        Correct
      </label>
      <Field label="Rationale">
        <textarea
          className={`${studioFieldClass} min-h-[80px]`}
          value={option.rationale}
          onChange={(e) => onChange({ ...option, rationale: e.target.value })}
        />
      </Field>
      {!option.isCorrect && (
        <Field label="Distractor antipattern">
          <input
            type="text"
            className={studioFieldClass}
            value={option.distractorAntipattern ?? ''}
            onChange={(e) =>
              onChange({
                ...option,
                distractorAntipattern: e.target.value || undefined,
              })
            }
          />
        </Field>
      )}
      {option.isCorrect && (
        <Field label="Citation URL">
          <CitationPicker
            value={option.citationUrl ?? ''}
            onChange={(url) => onChange({ ...option, citationUrl: url || undefined })}
          />
        </Field>
      )}
      <Field label="Diagram URL">
        <input
          type="text"
          className={studioFieldClass}
          value={option.diagramUrl ?? ''}
          onChange={(e) => onChange({ ...option, diagramUrl: e.target.value || undefined })}
          placeholder="/diagrams/…"
        />
        {diagramOk === false && (
          <p className="mt-1 text-xs text-miro-dangerText">Not found under public/</p>
        )}
        {diagramOk === true && <p className="mt-1 text-xs text-miro-slate">Found in public/</p>}
      </Field>
    </div>
  );
};
