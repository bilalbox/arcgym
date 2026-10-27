import type { WordingFinding } from "@arcgym/drill-core";
import type React from "react";

interface WordingFindingsProps {
	findings: WordingFinding[];
}

export const WordingFindings: React.FC<WordingFindingsProps> = ({
	findings,
}) => {
	if (findings.length === 0) {
		return <p className="text-xs text-miro-slate">No wording findings</p>;
	}

	return (
		<ul className="space-y-1.5">
			{findings.map((f) => (
				<li
					key={`${f.ruleId}:${f.where}:${f.message}`}
					className="text-xs text-miro-slate border border-miro-hairline rounded-md px-2.5 py-1.5 bg-miro-surfaceSoft"
				>
					<span className="font-mono text-miro-muted">{f.ruleId}</span>
					<span className="text-miro-muted"> · </span>
					<span className="font-mono">{f.where}</span>
					<span className="block mt-0.5 text-miro-primary">{f.message}</span>
				</li>
			))}
		</ul>
	);
};
