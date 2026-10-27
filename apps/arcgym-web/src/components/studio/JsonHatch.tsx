import type { DrillDefinitionDTO } from "@arcgym/drill-core";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { studioFieldClass } from "@/studio/fieldStyles";

interface JsonHatchProps {
	drill: DrillDefinitionDTO;
	onApply: (next: DrillDefinitionDTO) => void;
}

export const JsonHatch: React.FC<JsonHatchProps> = ({ drill, onApply }) => {
	const [text, setText] = useState(() => JSON.stringify(drill, null, 2));
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setText(JSON.stringify(drill, null, 2));
		setError(null);
	}, [drill]);

	const apply = () => {
		try {
			const parsed = JSON.parse(text) as DrillDefinitionDTO;
			if (String(parsed.id).toUpperCase() !== String(drill.id).toUpperCase()) {
				setError(`id must remain ${drill.id}`);
				return;
			}
			onApply(parsed);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid JSON");
		}
	};

	return (
		<div className="space-y-3">
			<textarea
				className={`${studioFieldClass} min-h-[420px] font-mono text-xs leading-relaxed`}
				value={text}
				onChange={(e) => {
					setText(e.target.value);
					setError(null);
				}}
				spellCheck={false}
			/>
			{error && <p className="text-xs text-miro-dangerText">{error}</p>}
			<Button type="button" variant="secondary" size="sm" onClick={apply}>
				Apply JSON
			</Button>
		</div>
	);
};
