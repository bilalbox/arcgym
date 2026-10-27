import {
	getRemainingProbeBudget,
	getUnlockedProbes,
	type ProbeOptionDTO,
} from "@arcgym/drill-core";
import { Lock } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProbeBudgetPanelProps {
	probes: ProbeOptionDTO[];
	selectedProbeIds: string[];
	probesLocked: boolean;
	probeBudget: number;
	onToggleProbe: (probeId: string) => void;
	onLockProbes: () => void;
	className?: string;
}

export const ProbeBudgetPanel: React.FC<ProbeBudgetPanelProps> = ({
	probes,
	selectedProbeIds,
	probesLocked,
	probeBudget,
	onToggleProbe,
	onLockProbes,
	className = "",
}) => {
	const budgetLeft = getRemainingProbeBudget(probeBudget, selectedProbeIds);
	const unlocked = getUnlockedProbes(probes, selectedProbeIds);

	return (
		<div className={`space-y-3 ${className}`.trim()}>
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-semibold uppercase tracking-wider text-miro-slate">
					Probes
				</h3>
				<Badge variant="outline" className="text-[11px] font-mono">
					{budgetLeft} / {probeBudget}
				</Badge>
			</div>

			<div className="space-y-2">
				{probes.map((probe) => {
					const selected = selectedProbeIds.includes(probe.id);
					const disabled = probesLocked || (!selected && budgetLeft <= 0);
					return (
						<button
							key={probe.id}
							type="button"
							disabled={disabled}
							onClick={() => onToggleProbe(probe.id)}
							className={`w-full text-left rounded-xl border px-3.5 py-3 text-sm transition-colors ${
								selected
									? "border-miro-primary bg-miro-surface text-miro-primary"
									: "border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong"
							} ${disabled && !selected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
						>
							<span className="font-medium">{probe.label}</span>
						</button>
					);
				})}
			</div>

			{!probesLocked && (
				<Button
					onClick={onLockProbes}
					disabled={selectedProbeIds.length === 0}
					className="w-full gap-2"
				>
					<Lock className="h-4 w-4" /> Lock probes
				</Button>
			)}

			{probesLocked && unlocked.length > 0 && (
				<div className="rounded-xl border border-miro-hairline bg-miro-surface p-3.5 space-y-2.5">
					{unlocked.map((probe) => (
						<div key={probe.id} className="text-sm">
							<p className="font-medium text-miro-primary">{probe.label}</p>
							<p className="text-miro-slate mt-0.5">{probe.answer}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
