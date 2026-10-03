import {
  ARCHITECTURAL_DOMAIN_LABELS,
  ARCHITECTURAL_DOMAINS,
  type ArchitecturalDomain,
  type DrillDefinitionDTO,
  WELL_ARCHITECTED_PILLAR_LABELS,
  WELL_ARCHITECTED_PILLARS,
  type WellArchitectedPillar,
} from '@arcgym/drill-core';
import type React from 'react';
import { Field, studioFieldClass } from '@/studio/fieldStyles';

const DIFFICULTIES = ['Associate_Domain_Architect', 'Lead_CTA'] as const;

interface MetadataFormProps {
  drill: DrillDefinitionDTO;
  onChange: (next: DrillDefinitionDTO) => void;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({ drill, onChange }) => {
  const togglePillar = (pillar: WellArchitectedPillar) => {
    const has = drill.pillars.includes(pillar);
    onChange({
      ...drill,
      pillars: has ? drill.pillars.filter((p) => p !== pillar) : [...drill.pillars, pillar],
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="ID">
          <input type="text" className={studioFieldClass} value={drill.id} disabled />
        </Field>
        <Field label="Status">
          <input type="text" className={studioFieldClass} value={drill.status} disabled />
        </Field>
        <Field label="Title">
          <input
            type="text"
            className={studioFieldClass}
            value={drill.title}
            onChange={(e) => onChange({ ...drill, title: e.target.value })}
          />
        </Field>
        <Field label="Domain label">
          <input
            type="text"
            className={studioFieldClass}
            value={drill.domainLabel}
            onChange={(e) => onChange({ ...drill, domainLabel: e.target.value })}
          />
        </Field>
        <Field label="Domain">
          <select
            className={studioFieldClass}
            value={drill.domain}
            onChange={(e) => onChange({ ...drill, domain: e.target.value as ArchitecturalDomain })}
          >
            {ARCHITECTURAL_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {ARCHITECTURAL_DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty">
          <select
            className={studioFieldClass}
            value={drill.difficulty}
            onChange={(e) =>
              onChange({
                ...drill,
                difficulty: e.target.value as DrillDefinitionDTO['difficulty'],
              })
            }
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Version">
          <input
            type="number"
            className={studioFieldClass}
            value={drill.version}
            onChange={(e) => onChange({ ...drill, version: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Source card IDs (comma-separated)">
          <input
            type="text"
            className={studioFieldClass}
            value={(drill.sourceCardIds ?? []).join(', ')}
            onChange={(e) => {
              const ids = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...drill, sourceCardIds: ids.length > 0 ? ids : undefined });
            }}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="text-[11px] uppercase tracking-wider text-miro-muted font-medium mb-2">
          Pillars
        </legend>
        <div className="flex flex-wrap gap-2">
          {WELL_ARCHITECTED_PILLARS.map((pillar) => {
            const on = drill.pillars.includes(pillar);
            return (
              <button
                key={pillar}
                type="button"
                onClick={() => togglePillar(pillar)}
                className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                  on
                    ? 'bg-miro-primary text-miro-onPrimary border-miro-primary'
                    : 'bg-miro-card text-miro-slate border-miro-hairline hover:border-miro-hairlineStrong'
                }`}
              >
                {WELL_ARCHITECTED_PILLAR_LABELS[pillar]}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};
