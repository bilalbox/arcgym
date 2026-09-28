import {
  calculateProficiencyReport,
  calculateTotalPoints,
  type DrillAttemptRecord,
  type DrillDefinitionDTO,
} from '@arcgym/drill-core';
import { CheckCircle2, Trophy, Zap } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Footer } from '@/components/layout/Footer';
import { ArchitecturalRadarChart } from '@/components/proficiency/ArchitecturalRadarChart';
import { CollectingDataSection } from '@/components/proficiency/CollectingDataSection';
import { StrengthsSection } from '@/components/proficiency/StrengthsSection';
import { WhereToStartSection } from '@/components/proficiency/WhereToStartSection';

interface SkillProfilePageProps {
  completedDrills: Record<string, DrillAttemptRecord>;
  allDrills: DrillDefinitionDTO[];
  totalPoints?: number;
  navigate: (to: string) => void;
  pathname: string;
}

export const SkillProfilePage: React.FC<SkillProfilePageProps> = ({
  completedDrills,
  allDrills,
  totalPoints: propTotalPoints,
  navigate,
  pathname,
}) => {
  const totalPoints = useMemo(() => {
    return propTotalPoints !== undefined ? propTotalPoints : calculateTotalPoints(completedDrills);
  }, [propTotalPoints, completedDrills]);

  // Compute domain report for the 7 Architectural Domains
  const report = useMemo(
    () => calculateProficiencyReport(completedDrills, allDrills, 4),
    [completedDrills, allDrills],
  );

  const handleReviewDrills = (id: string) => {
    navigate(`/?domain=${id}`);
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Title & Description */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
          Your architectural skill profile
        </h1>
        <p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
          We score drill questions across 7 Architectural Domains. Each decision rep counts toward
          your proficiency. Here's where you stand.
        </p>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-miro-card rounded-2xl border border-miro-hairline shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-miro-lavenderLight flex items-center justify-center text-miro-blue shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] text-miro-muted uppercase tracking-wider font-medium block">
              Question Reps
            </span>
            <span className="text-base sm:text-lg font-semibold text-miro-primary">
              {report.totalQuestionsAnswered} reps
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-miro-yellowLight flex items-center justify-center text-miro-yellowText shrink-0">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] text-miro-muted uppercase tracking-wider font-medium block">
              Total Points
            </span>
            <span className="text-base sm:text-lg font-semibold text-miro-primary">
              {totalPoints.toLocaleString()}{' '}
              <span className="text-xs font-normal text-miro-muted">pts</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-miro-successLight flex items-center justify-center text-miro-successText shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] text-miro-muted uppercase tracking-wider font-medium block">
              Measured Domains
            </span>
            <span className="text-base sm:text-lg font-semibold text-miro-successText">
              {report.measuredCount} of {report.totalCount} active
            </span>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <ArchitecturalRadarChart
        items={report.items}
        title="Architectural Domain Proficiency Radar"
        onSelectItem={handleReviewDrills}
      />

      {/* Triage Accordions */}
      <div className="mt-8 space-y-0 bg-miro-card/50 rounded-2xl border border-miro-hairline overflow-hidden p-2 sm:p-4">
        <WhereToStartSection
          items={report.whereToStart}
          dimensionLabel="domain"
          onReviewDrills={handleReviewDrills}
        />

        <StrengthsSection items={report.strengths} dimensionLabel="domain" />

        <CollectingDataSection
          items={report.collectingData}
          dimensionLabel="domain"
          onReviewDrills={handleReviewDrills}
        />
      </div>

      <Footer navigate={navigate} currentPath={pathname} />
    </div>
  );
};
