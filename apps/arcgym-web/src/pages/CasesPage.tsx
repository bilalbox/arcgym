import type {
	CaseFileDrillDefinition,
	DrillAttemptRecord,
} from "@arcgym/drill-core";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type React from "react";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CasesPageProps {
	caseFiles: CaseFileDrillDefinition[];
	completedDrills: Record<string, DrillAttemptRecord>;
	navigate: (to: string) => void;
	pathname: string;
}

export const CasesPage: React.FC<CasesPageProps> = ({
	caseFiles,
	completedDrills,
	navigate,
	pathname,
}) => {
	return (
		<main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="inline-flex items-center gap-1.5 text-xs font-medium text-miro-slate hover:text-miro-primary transition-colors cursor-pointer group"
				>
					<ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
					Back to Home
				</button>
			</div>

			<div className="space-y-2">
				<h1 className="text-2xl sm:text-3xl font-medium text-miro-primary tracking-tight">
					Cases
				</h1>
				<p className="text-sm sm:text-base text-miro-slate max-w-2xl leading-relaxed">
					Brief, Probe Budget, three or more Stations.
				</p>
			</div>

			{caseFiles.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-miro-hairline bg-miro-card p-8 text-center">
					<p className="text-sm font-medium text-miro-slate">
						No Case Files yet
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{caseFiles.map((drill) => (
						<CaseFileCard
							key={drill.id}
							drill={drill}
							completed={completedDrills[drill.id]}
							onOpen={() => navigate(`/cases/${drill.id}`)}
						/>
					))}
				</div>
			)}

			<Footer navigate={navigate} currentPath={pathname} />
		</main>
	);
};

function CaseFileCard({
	drill,
	completed,
	onOpen,
}: {
	drill: CaseFileDrillDefinition;
	completed?: DrillAttemptRecord;
	onOpen: () => void;
}) {
	return (
		<Card className="border-miro-hairline bg-miro-card shadow-xs">
			<CardHeader className="pb-2 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline" className="text-[11px] font-mono">
						{drill.id}
					</Badge>
					{completed && (
						<Badge variant="success" className="text-[11px]">
							+{completed.score} pts
						</Badge>
					)}
				</div>
				<h3 className="text-lg font-medium text-miro-primary tracking-tight">
					{drill.title}
				</h3>
				<p className="text-sm text-miro-slate line-clamp-2">
					{drill.brief.synopsis}
				</p>
			</CardHeader>
			<CardContent className="pt-0 flex justify-end">
				<Button
					onClick={onOpen}
					className="gap-1.5 bg-miro-primary hover:bg-miro-charcoal text-miro-onPrimary text-xs"
				>
					Open <ArrowRight className="h-3.5 w-3.5" />
				</Button>
			</CardContent>
		</Card>
	);
}
