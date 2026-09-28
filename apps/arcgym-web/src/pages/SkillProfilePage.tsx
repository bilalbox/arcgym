import React, { useMemo, useState } from 'react';
import {
  calculateProficiencyReport,
  DrillAttemptRecord,
  DrillDefinitionDTO,
  ProficiencyDimension,
} from '@arcgym/drill-core';
import { DimensionToggle } from '@/components/proficiency/DimensionToggle';
import { ArchitecturalRadarChart } from '@/components/proficiency/ArchitecturalRadarChart';
import { WhereToStartSection } from '@/components/proficiency/WhereToStartSection';
import { StrengthsSection } from '@/components/proficiency/StrengthsSection';
import { CollectingDataSection } from '@/components/proficiency/CollectingDataSection';
import { Footer } from '@/components/layout/Footer';
import { Award, Zap, CheckCircle2 } from 'lucide-react';

interface SkillProfilePageProps {
  completedDrills: Record<string, DrillAttemptRecord>;
  allDrills: DrillDefinitionDTO[];
  navigate: (to: string) => void;
  pathname: string;
}

export const SkillProfilePage: React.FC<SkillProfilePageProps> = ({
  completedDrills,
  allDrills,
  navigate,
  pathname,
}) => {
  const [dimension, setDimension] = useState<ProficiencyDimension>('domains');

  // Compute reports for both dimensions
  const domainReport = useMemo(
    () => calculateProficiencyReport(completedDrills, allDrills, 'domains', 4),
    [completedDrills, allDrills]
  );

  const pillarReport = useMemo(
    () => calculateProficiencyReport(completedDrills, allDrills, 'pillars', 4),
    [completedDrills, allDrills]
  );

  const activeReport = dimension === 'domains' ? domainReport : pillarReport;
  const dimensionNoun = dimension === 'domains' ? 'domain' : 'pillar';

  const handleReviewDrills = (id: string) => {
    if (dimension === 'domains') {
      navigate(`/?domain=${id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title & Description */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-miro-lavenderLight border border-miro-lavenderBorder text-miro-blue text-xs font-medium mb-1">
          <Award className="h-3.5 w-3.5" />
          Architect Diagnostic Telemetry
        </div>

        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Your architectural skill profile
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          We score drill questions across 7 Architectural Domains and 5 Well-Architected Pillars. Each decision rep counts toward your proficiency. Here's where you stand.
        </p>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-miro-card rounded-2xl border border-miro-hairline shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-miro-lavenderLight flex items-center justify-center text-miro-blue shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] text-miro-muted uppercase tracking-wider font-medium block">
              Question Reps
            </span>
            <span className="text-base sm:text-lg font-semibold text-miro-primary">
              {activeReport.totalQuestionsAnswered} reps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-miro-successLight flex items-center justify-center text-miro-successText shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] text-miro-muted uppercase tracking-wider font-medium block">
              Measured Skills
            </span>
            <span className="text-base sm:text-lg font-semibold text-miro-successText">
              {activeReport.measuredCount} of {activeReport.totalCount} active
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
          <DimensionToggle
            value={dimension}
            onChange={setDimension}
            measuredDomainsCount={domainReport.measuredCount}
            measuredPillarsCount={pillarReport.measuredCount}
          />
        </div>
      </div>

      {/* Radar Chart */}
      <ArchitecturalRadarChart
        items={activeReport.items}
        title={
          dimension === 'domains'
            ? 'Architectural Domain Proficiency Radar'
            : 'Well-Architected Pillar Proficiency Radar'
        }
        onSelectItem={handleReviewDrills}
      />

      {/* Triage Accordions */}
      <div className="mt-8 space-y-0 bg-miro-card/50 rounded-2xl border border-miro-hairline overflow-hidden p-2 sm:p-4">
        <WhereToStartSection
          items={activeReport.whereToStart}
          dimensionLabel={dimensionNoun}
          onReviewDrills={handleReviewDrills}
        />

        <StrengthsSection
          items={activeReport.strengths}
          dimensionLabel={dimensionNoun}
        />

        <CollectingDataSection
          items={activeReport.collectingData}
          dimensionLabel={dimensionNoun}
          onReviewDrills={handleReviewDrills}
        />
      </div>

      <Footer navigate={navigate} currentPath={pathname} />
    </div>
  );
};
