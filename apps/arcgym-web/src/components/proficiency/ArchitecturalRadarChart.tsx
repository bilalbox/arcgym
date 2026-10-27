import type { DimensionProficiency } from "@arcgym/drill-core";
import type React from "react";
import { useState } from "react";

interface ArchitecturalRadarChartProps {
	items: DimensionProficiency[];
	title: string;
	onSelectItem?: (id: string) => void;
}

interface VertexCoord {
	item: DimensionProficiency;
	index: number;
	angle: number;
	// Wide (desktop)
	spokeX: number;
	spokeY: number;
	pointX: number;
	pointY: number;
	labelX: number;
	labelY: number;
	textAnchor: "start" | "end" | "middle";
	// Narrow (mobile)
	narrowSpokeX: number;
	narrowSpokeY: number;
	narrowPointX: number;
	narrowPointY: number;
	narrowLabelX: number;
	narrowLabelY: number;
}

function splitLabel(label: string): string[] {
	const words = label.split(" ");
	if (words.length <= 1) return [label];
	if (words.length === 2) return words;
	const mid = Math.ceil(words.length / 2);
	return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export const ArchitecturalRadarChart: React.FC<
	ArchitecturalRadarChartProps
> = ({ items, title, onSelectItem }) => {
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	const N = items.length;
	if (N === 0) return null;

	// Geometry parameters
	// Desktop wide view
	const cx = 360;
	const cy = 255;
	const R = 165;
	const r50 = 82.5;

	// Mobile narrow view
	const ncx = 180;
	const ncy = 160;
	const nR = 78;
	const nr50 = 39;

	const vertices: VertexCoord[] = items.map((item, i) => {
		const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const ratio = item.isMeasured ? Math.max(0.05, item.accuracy / 100) : 0;

		// Desktop
		const spokeX = Number((cx + R * cos).toFixed(1));
		const spokeY = Number((cy + R * sin).toFixed(1));
		const pointX = Number((cx + R * ratio * cos).toFixed(1));
		const pointY = Number((cy + R * ratio * sin).toFixed(1));
		const labelX = Number((cx + (R + 24) * cos).toFixed(1));
		const labelY = Number((cy + (R + 24) * sin).toFixed(1));

		// Mobile
		const narrowSpokeX = Number((ncx + nR * cos).toFixed(1));
		const narrowSpokeY = Number((ncy + nR * sin).toFixed(1));
		const narrowPointX = Number((ncx + nR * ratio * cos).toFixed(1));
		const narrowPointY = Number((ncy + nR * ratio * sin).toFixed(1));
		const narrowLabelX = Number((ncx + (nR + 16) * cos).toFixed(1));
		const narrowLabelY = Number((ncy + (nR + 16) * sin).toFixed(1));

		let textAnchor: "start" | "end" | "middle" = "middle";
		if (cos > 0.15) textAnchor = "start";
		else if (cos < -0.15) textAnchor = "end";

		return {
			item,
			index: i,
			angle,
			spokeX,
			spokeY,
			pointX,
			pointY,
			labelX,
			labelY,
			textAnchor,
			narrowSpokeX,
			narrowSpokeY,
			narrowPointX,
			narrowPointY,
			narrowLabelX,
			narrowLabelY,
		};
	});

	const measuredVertices = vertices.filter((v) => v.item.isMeasured);
	const hasMeasured = measuredVertices.length > 0;

	// Build polygon path
	const widePolygonPoints = vertices
		.map((v) => (v.item.isMeasured ? `${v.pointX},${v.pointY}` : `${cx},${cy}`))
		.join(" ");

	const narrowPolygonPoints = vertices
		.map((v) =>
			v.item.isMeasured
				? `${v.narrowPointX},${v.narrowPointY}`
				: `${ncx},${ncy}`,
		)
		.join(" ");

	const activeItem = items.find((i) => i.id === hoveredId);

	return (
		<div className="bg-miro-card border border-miro-hairline rounded-2xl p-4 sm:p-6 shadow-xs relative">
			{/* Active tooltip bar */}
			<div className="min-h-7 flex items-center justify-between text-xs px-2 mb-2">
				{activeItem ? (
					<div className="flex items-center gap-2">
						<span className="font-semibold text-miro-primary">
							{activeItem.label}:
						</span>
						{activeItem.isMeasured ? (
							<span className="text-miro-slate">
								<span className="font-medium text-miro-successText">
									{activeItem.accuracy}%
								</span>{" "}
								· {activeItem.correctQuestions} of {activeItem.totalQuestions}{" "}
								questions right
							</span>
						) : (
							<span className="text-miro-muted">
								{activeItem.totalQuestions} of 4 answered so far (collecting
								data)
							</span>
						)}
					</div>
				) : (
					<span className="text-miro-muted">
						Hover or tap any vertex to view domain rep breakdown
					</span>
				)}
				<span className="text-[11px] font-mono text-miro-muted hidden sm:inline">
					{measuredVertices.length} of {N} measured
				</span>
			</div>

			<div className="relative w-full flex justify-center">
				{/* Desktop Radar (sm and up) */}
				<svg
					viewBox="0 44.3 720 415.9"
					width="100%"
					className="hidden sm:block select-none"
					aria-label={title}
				>
					{/* Guide Rings */}
					<circle
						cx={cx}
						cy={cy}
						r={r50}
						fill="none"
						stroke="currentColor"
						className="text-miro-hairline"
						strokeDasharray="3 3"
					/>
					<circle
						cx={cx}
						cy={cy}
						r={R}
						fill="none"
						stroke="currentColor"
						className="text-miro-hairlineStrong"
					/>
					<text
						x={cx + 6}
						y={cy - r50 + 4}
						fontSize="10"
						fill="currentColor"
						className="text-miro-muted"
					>
						50%
					</text>
					<text
						x={cx + 6}
						y={cy - R + 4}
						fontSize="10"
						fill="currentColor"
						className="text-miro-muted"
					>
						100%
					</text>

					{/* Spokes */}
					{vertices.map((v) => (
						<line
							key={`spoke-${v.item.id}`}
							x1={cx}
							y1={cy}
							x2={v.spokeX}
							y2={v.spokeY}
							stroke="currentColor"
							strokeWidth="1"
							className={
								v.item.isMeasured
									? "text-miro-hairlineStrong"
									: "text-miro-hairline"
							}
						/>
					))}

					{/* Polygon fill */}
					{hasMeasured && (
						<polygon
							points={widePolygonPoints}
							fill="var(--miro-blueFill)"
							stroke="var(--miro-blue)"
							strokeWidth="2"
							strokeLinejoin="round"
						/>
					)}

					{/* Vertices & Labels */}
					{vertices.map((v) => {
						const lines = splitLabel(v.item.label);
						const isHovered = hoveredId === v.item.id;

						return (
							/* biome-ignore lint/a11y/useSemanticElements: SVG g cannot be replaced with HTML button */
							<g
								key={`vertex-${v.item.id}`}
								role="button"
								tabIndex={0}
								onMouseEnter={() => setHoveredId(v.item.id)}
								onMouseLeave={() => setHoveredId(null)}
								onClick={() => onSelectItem?.(v.item.id)}
								className="cursor-pointer outline-none group"
								aria-label={`${v.item.label}: ${
									v.item.isMeasured
										? `${v.item.accuracy}% (${v.item.correctQuestions}/${v.item.totalQuestions})`
										: `${v.item.totalQuestions} of 4 so far`
								}`}
							>
								{/* Hit target */}
								<circle
									cx={v.item.isMeasured ? v.pointX : v.spokeX}
									cy={v.item.isMeasured ? v.pointY : v.spokeY}
									r="16"
									fill="transparent"
								/>

								{/* Point */}
								{v.item.isMeasured ? (
									<circle
										cx={v.pointX}
										cy={v.pointY}
										r={isHovered ? 7 : 5}
										fill="var(--miro-blue)"
										stroke="var(--miro-card)"
										strokeWidth="2"
										className="transition-all duration-150"
									/>
								) : (
									<circle
										cx={v.spokeX}
										cy={v.spokeY}
										r="4"
										fill="none"
										stroke="currentColor"
										className="text-miro-hairlineStrong"
										strokeDasharray="2 2"
									/>
								)}

								{/* Label text */}
								<text
									x={v.labelX}
									y={v.labelY}
									textAnchor={v.textAnchor}
									fontSize="12"
									fontWeight={isHovered ? "500" : "400"}
									className={
										v.item.isMeasured
											? isHovered
												? "fill-miro-blue"
												: "fill-miro-primary"
											: "fill-miro-muted"
									}
								>
									{lines.map((line) => (
										<tspan
											key={`${v.item.id}-l-${line}`}
											x={v.labelX}
											dy={
												lines.indexOf(line) === 0
													? `-${(lines.length - 1) * 0.5}em`
													: "1.15em"
											}
										>
											{line}
										</tspan>
									))}
								</text>
							</g>
						);
					})}
				</svg>

				{/* Mobile Radar (narrow) */}
				<svg
					viewBox="0 51.5 360 214.3"
					width="100%"
					className="sm:hidden select-none"
					aria-label={title}
				>
					{/* Guide Rings */}
					<circle
						cx={ncx}
						cy={ncy}
						r={nr50}
						fill="none"
						stroke="currentColor"
						className="text-miro-hairline"
						strokeDasharray="2 2"
					/>
					<circle
						cx={ncx}
						cy={ncy}
						r={nR}
						fill="none"
						stroke="currentColor"
						className="text-miro-hairlineStrong"
					/>
					<text
						x={ncx + 4}
						y={ncy - nr50 + 3}
						fontSize="8"
						fill="currentColor"
						className="text-miro-muted"
					>
						50%
					</text>
					<text
						x={ncx + 4}
						y={ncy - nR + 3}
						fontSize="8"
						fill="currentColor"
						className="text-miro-muted"
					>
						100%
					</text>

					{/* Spokes */}
					{vertices.map((v) => (
						<line
							key={`nspoke-${v.item.id}`}
							x1={ncx}
							y1={ncy}
							x2={v.narrowSpokeX}
							y2={v.narrowSpokeY}
							stroke="currentColor"
							strokeWidth="1"
							className={
								v.item.isMeasured
									? "text-miro-hairlineStrong"
									: "text-miro-hairline"
							}
						/>
					))}

					{/* Polygon fill */}
					{hasMeasured && (
						<polygon
							points={narrowPolygonPoints}
							fill="var(--miro-blueFill)"
							stroke="var(--miro-blue)"
							strokeWidth="1.5"
							strokeLinejoin="round"
						/>
					)}

					{/* Vertices & Labels */}
					{vertices.map((v) => {
						const lines = splitLabel(v.item.label);
						const isHovered = hoveredId === v.item.id;

						return (
							/* biome-ignore lint/a11y/useSemanticElements: SVG g cannot be replaced with HTML button */
							<g
								key={`nvertex-${v.item.id}`}
								role="button"
								tabIndex={0}
								onClick={() => {
									setHoveredId(v.item.id);
									onSelectItem?.(v.item.id);
								}}
								className="cursor-pointer outline-none"
							>
								<circle
									cx={v.item.isMeasured ? v.narrowPointX : v.narrowSpokeX}
									cy={v.item.isMeasured ? v.narrowPointY : v.narrowSpokeY}
									r="12"
									fill="transparent"
								/>

								{v.item.isMeasured ? (
									<circle
										cx={v.narrowPointX}
										cy={v.narrowPointY}
										r={isHovered ? 4.5 : 3.5}
										fill="var(--miro-blue)"
										stroke="var(--miro-card)"
										strokeWidth="1.5"
									/>
								) : (
									<circle
										cx={v.narrowSpokeX}
										cy={v.narrowSpokeY}
										r="3"
										fill="none"
										stroke="currentColor"
										className="text-miro-hairlineStrong"
										strokeDasharray="2 2"
									/>
								)}

								<text
									x={v.narrowLabelX}
									y={v.narrowLabelY}
									textAnchor={v.textAnchor}
									fontSize="8.5"
									className={
										v.item.isMeasured
											? isHovered
												? "fill-miro-blue font-medium"
												: "fill-miro-primary"
											: "fill-miro-muted"
									}
								>
									{lines.map((line) => (
										<tspan
											key={`${v.item.id}-nl-${line}`}
											x={v.narrowLabelX}
											dy={
												lines.indexOf(line) === 0
													? `-${(lines.length - 1) * 0.4}em`
													: "1.1em"
											}
										>
											{line}
										</tspan>
									))}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			<p className="text-[12.5px] text-miro-slate mt-2 px-1 text-center sm:text-left">
				<span className="font-medium text-miro-slate">How to read this. </span>
				Hover or tap any vertex to see your score. Domains require 4+ answered
				questions before appearing on the radar polygon.
			</p>
		</div>
	);
};
