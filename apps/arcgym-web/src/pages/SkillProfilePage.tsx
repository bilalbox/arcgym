import {
  type ClientDrillDefinitionDTO,
  calculateProficiencyReport,
  calculateTotalPoints,
  countProbeDrivenRevisions,
  type DrillAttemptRecord,
} from '@arcgym/drill-core';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { Footer } from '@/components/layout/Footer';
import { ArchitecturalRadarChart } from '@/components/proficiency/ArchitecturalRadarChart';
import { CollectingDataSection } from '@/components/proficiency/CollectingDataSection';
import { StrengthsSection } from '@/components/proficiency/StrengthsSection';
import { WhereToStartSection } from '@/components/proficiency/WhereToStartSection';

interface SkillProfilePageProps {
  completedDrills: Record<string, DrillAttemptRecord>;
  allDrills: ClientDrillDefinitionDTO[];
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

  const probeDrivenRevisions = useMemo(
    () => countProbeDrivenRevisions(completedDrills),
    [completedDrills],
  );

  const handleReviewDrills = (domainId: string) => {
    const incomplete = allDrills.find((d) => d.domain === domainId && !completedDrills[d.id]);
    if (!incomplete) {
      navigate('/cases');
      return;
    }
    navigate(
      incomplete.format === 'Case_File'
        ? `/cases/${incomplete.id}`
        : `/troubleshoot/${incomplete.id}`,
    );
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-miro-card rounded-2xl border border-miro-hairline">
        <div>
          <span className="text-xs text-miro-muted font-medium block mb-0.5">Question reps</span>
          <span className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {report.totalQuestionsAnswered}
          </span>
        </div>

        <div>
          <span className="text-xs text-miro-muted font-medium block mb-0.5">Points</span>
          <span className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {totalPoints.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-xs text-miro-muted font-medium block mb-0.5">Measured domains</span>
          <span className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {report.measuredCount}
            <span className="text-xs font-normal text-miro-muted"> of {report.totalCount}</span>
          </span>
        </div>

        <div>
          <span className="text-xs text-miro-muted font-medium block mb-0.5">
            Probe-driven revisions
          </span>
          <span className="text-base sm:text-lg font-semibold text-miro-primary font-mono tabular-nums">
            {probeDrivenRevisions}
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <ArchitecturalRadarChart
        items={report.items}
        title="Domain proficiency"
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
