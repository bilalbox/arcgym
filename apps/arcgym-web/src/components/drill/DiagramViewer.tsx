import { renderAsync } from "pele/lazy";
import { useEffect, useState } from "react";

export interface DiagramViewerProps {
	source?: string;
	url?: string;
	label?: string;
	className?: string;
}

/**
 * Sanitizes Mermaid diagram source by removing legacy classDef and style directives.
 * Node classes assigned with `:::className` are preserved, allowing ArcGym's Miro CSS tokens
 * to theme nodes dynamically across light and dark modes without hardcoded hex overrides.
 */
export function sanitizeDiagramSource(source: string): string {
	return source.replace(/^\s*(classDef|style)\s+.*$/gm, "").trim();
}

export function DiagramViewer({
	source,
	url,
	label,
	className = "",
}: DiagramViewerProps) {
	const [renderedSvg, setRenderedSvg] = useState<string | null>(null);

	useEffect(() => {
		if (!source?.trim()) {
			setRenderedSvg(null);
			return;
		}
		let cancelled = false;
		const cleanSource = sanitizeDiagramSource(source);
		renderAsync(cleanSource)
			.then((res) => {
				if (!cancelled) setRenderedSvg(res.svg);
			})
			.catch(() => {
				if (!cancelled) setRenderedSvg(null);
			});

		return () => {
			cancelled = true;
		};
	}, [source]);

	if (renderedSvg) {
		return (
			<figure
				className={`rounded-xl border border-miro-hairline bg-miro-surface overflow-hidden p-3 flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto ${className}`}
			>
				<div
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Pele outputs safe sanitized SVG
					dangerouslySetInnerHTML={{ __html: renderedSvg }}
					aria-label={label ?? "Architecture diagram"}
					role="img"
					className="w-full flex justify-center"
				/>
			</figure>
		);
	}

	if (url) {
		return (
			<figure
				className={`rounded-xl border border-miro-hairline bg-miro-surface overflow-hidden ${className}`}
			>
				<img
					src={url}
					alt={label ?? "Architecture diagram"}
					className="w-full h-auto"
				/>
			</figure>
		);
	}

	return null;
}
