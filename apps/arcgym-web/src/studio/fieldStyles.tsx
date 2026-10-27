import type React from "react";

export const studioFieldClass =
	"w-full rounded-md border border-miro-hairline bg-miro-card px-3 py-2 text-sm text-miro-primary placeholder:text-miro-muted focus:outline-none focus:ring-2 focus:ring-miro-blue focus:border-miro-blue";

export const studioLabelClass =
	"block text-[11px] uppercase tracking-wider text-miro-muted font-medium mb-1";

export const studioSectionClass =
	"rounded-xl border border-miro-hairline bg-miro-card p-4 space-y-3";

export function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}): React.ReactElement {
	return (
		<div className="block">
			<span className={studioLabelClass}>{label}</span>
			{children}
		</div>
	);
}
