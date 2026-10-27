import {
	ARCHITECTURAL_DOMAIN_LABELS,
	ARCHITECTURAL_DOMAINS,
	type ArchitecturalDomain,
	BOARD_DOMAIN_LABELS,
	BOARD_DOMAINS,
	type BoardDomain,
	type CaseFileDrillDefinition,
	type CaseFileStationDTO,
	type DrillOptionDTO,
	type ProbeOptionDTO,
	type ProbeTier,
} from "@arcgym/drill-core";
import type React from "react";
import { OptionEditor } from "@/components/studio/OptionEditor";
import { Button } from "@/components/ui/button";
import {
	Field,
	studioFieldClass,
	studioSectionClass,
} from "@/studio/fieldStyles";

const PROBE_TIERS: ProbeTier[] = ["pivotal", "useful", "distractor"];

interface CaseFileEditorProps {
	drill: CaseFileDrillDefinition;
	onChange: (next: CaseFileDrillDefinition) => void;
}

function nextProbeId(stationId: string, probes: ProbeOptionDTO[]): string {
	let n = probes.length + 1;
	while (probes.some((p) => p.id === `${stationId}_p${n}`)) n += 1;
	return `${stationId}_p${n}`;
}

function nextOptionId(stationId: string, options: DrillOptionDTO[]): string {
	const letters = "abcdefghijklmnopqrstuvwxyz";
	for (const letter of letters) {
		const id = `${stationId}_${letter}`;
		if (!options.some((o) => o.id === id)) return id;
	}
	return `${stationId}_opt${options.length + 1}`;
}

function emptyStation(index: number): CaseFileStationDTO {
	const id = `st_${index + 1}`;
	return {
		id,
		domain: "Platform_Core",
		boardDomain: "System_Architecture",
		prompt: "",
		probeBudget: 3,
		probes: [
			{ id: `${id}_p1`, label: "", tier: "pivotal", answer: "" },
			{ id: `${id}_p2`, label: "", tier: "pivotal", answer: "" },
			{ id: `${id}_p3`, label: "", tier: "useful", answer: "" },
			{
				id: `${id}_p4`,
				label: "",
				tier: "distractor",
				answer: "",
				distractorAntipattern: "",
			},
			{
				id: `${id}_p5`,
				label: "",
				tier: "distractor",
				answer: "",
				distractorAntipattern: "",
			},
		],
		options: [
			{ id: `${id}_a`, label: "", isCorrect: true, rationale: "" },
			{
				id: `${id}_b`,
				label: "",
				isCorrect: false,
				rationale: "",
				distractorAntipattern: "",
			},
		],
	};
}

export const CaseFileEditor: React.FC<CaseFileEditorProps> = ({
	drill,
	onChange,
}) => {
	const updateStation = (index: number, station: CaseFileStationDTO) => {
		const stations = drill.stations.slice();
		stations[index] = station;
		onChange({ ...drill, stations });
	};

	return (
		<div className="space-y-4">
			<div className={studioSectionClass}>
				<Field label="Brief title">
					<input
						type="text"
						className={studioFieldClass}
						value={drill.brief.title}
						onChange={(e) =>
							onChange({
								...drill,
								brief: { ...drill.brief, title: e.target.value },
							})
						}
					/>
				</Field>
				<Field label="Synopsis">
					<textarea
						className={`${studioFieldClass} min-h-[120px]`}
						value={drill.brief.synopsis}
						onChange={(e) =>
							onChange({
								...drill,
								brief: { ...drill.brief, synopsis: e.target.value },
							})
						}
					/>
				</Field>
			</div>

			{drill.stations.map((station, stationIndex) => (
				<div key={station.id} className={studioSectionClass}>
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-medium text-miro-primary">
							Station{" "}
							<span className="font-mono text-xs text-miro-muted">
								{station.id}
							</span>
						</span>
						{drill.stations.length > 3 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() =>
									onChange({
										...drill,
										stations: drill.stations.filter(
											(_, i) => i !== stationIndex,
										),
									})
								}
							>
								Remove station
							</Button>
						)}
					</div>

					<div className="grid sm:grid-cols-3 gap-3">
						<Field label="Domain">
							<select
								className={studioFieldClass}
								value={station.domain}
								onChange={(e) =>
									updateStation(stationIndex, {
										...station,
										domain: e.target.value as ArchitecturalDomain,
									})
								}
							>
								{ARCHITECTURAL_DOMAINS.map((d) => (
									<option key={d} value={d}>
										{ARCHITECTURAL_DOMAIN_LABELS[d]}
									</option>
								))}
							</select>
						</Field>
						<Field label="Board domain">
							<select
								className={studioFieldClass}
								value={station.boardDomain}
								onChange={(e) =>
									updateStation(stationIndex, {
										...station,
										boardDomain: e.target.value as BoardDomain,
									})
								}
							>
								{BOARD_DOMAINS.map((d) => (
									<option key={d} value={d}>
										{BOARD_DOMAIN_LABELS[d]}
									</option>
								))}
							</select>
						</Field>
						<Field label="Probe budget">
							<input
								type="number"
								min={1}
								className={studioFieldClass}
								value={station.probeBudget}
								onChange={(e) =>
									updateStation(stationIndex, {
										...station,
										probeBudget: Number(e.target.value) || 1,
									})
								}
							/>
						</Field>
					</div>

					<Field label="Prompt">
						<textarea
							className={`${studioFieldClass} min-h-[80px]`}
							value={station.prompt}
							onChange={(e) =>
								updateStation(stationIndex, {
									...station,
									prompt: e.target.value,
								})
							}
						/>
					</Field>

					<div className="space-y-2">
						<p className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
							Probes
						</p>
						{station.probes.map((probe, probeIndex) => (
							<div
								key={probe.id}
								className="rounded-lg border border-miro-hairline p-3 space-y-2 bg-miro-surfaceSoft"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-mono text-xs text-miro-muted">
										{probe.id}
									</span>
									{station.probes.length > 5 && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() =>
												updateStation(stationIndex, {
													...station,
													probes: station.probes.filter(
														(_, i) => i !== probeIndex,
													),
												})
											}
										>
											Remove
										</Button>
									)}
								</div>
								<Field label="Label">
									<textarea
										className={`${studioFieldClass} min-h-[48px]`}
										value={probe.label}
										onChange={(e) => {
											const probes = station.probes.slice();
											probes[probeIndex] = { ...probe, label: e.target.value };
											updateStation(stationIndex, { ...station, probes });
										}}
									/>
								</Field>
								<Field label="Tier">
									<select
										className={studioFieldClass}
										value={probe.tier}
										onChange={(e) => {
											const probes = station.probes.slice();
											probes[probeIndex] = {
												...probe,
												tier: e.target.value as ProbeTier,
											};
											updateStation(stationIndex, { ...station, probes });
										}}
									>
										{PROBE_TIERS.map((t) => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</Field>
								<Field label="Answer">
									<textarea
										className={`${studioFieldClass} min-h-[60px]`}
										value={probe.answer}
										onChange={(e) => {
											const probes = station.probes.slice();
											probes[probeIndex] = { ...probe, answer: e.target.value };
											updateStation(stationIndex, { ...station, probes });
										}}
									/>
								</Field>
								{probe.tier === "distractor" && (
									<Field label="Distractor antipattern">
										<input
											type="text"
											className={studioFieldClass}
											value={probe.distractorAntipattern ?? ""}
											onChange={(e) => {
												const probes = station.probes.slice();
												probes[probeIndex] = {
													...probe,
													distractorAntipattern: e.target.value || undefined,
												};
												updateStation(stationIndex, { ...station, probes });
											}}
										/>
									</Field>
								)}
							</div>
						))}
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() =>
								updateStation(stationIndex, {
									...station,
									probes: [
										...station.probes,
										{
											id: nextProbeId(station.id, station.probes),
											label: "",
											tier: "useful",
											answer: "",
										},
									],
								})
							}
						>
							Add probe
						</Button>
					</div>

					<div className="space-y-3 pt-2">
						<p className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
							Recommendation options
						</p>
						{station.options.map((option, optIndex) => (
							<OptionEditor
								key={option.id}
								option={option}
								canRemove={station.options.length > 2}
								onRemove={() =>
									updateStation(stationIndex, {
										...station,
										options: station.options.filter((_, i) => i !== optIndex),
									})
								}
								onChange={(next) => {
									const options = station.options.slice();
									options[optIndex] = next;
									updateStation(stationIndex, { ...station, options });
								}}
							/>
						))}
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() =>
								updateStation(stationIndex, {
									...station,
									options: [
										...station.options,
										{
											id: nextOptionId(station.id, station.options),
											label: "",
											isCorrect: false,
											rationale: "",
											distractorAntipattern: "",
										},
									],
								})
							}
						>
							Add option
						</Button>
					</div>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() =>
					onChange({
						...drill,
						stations: [...drill.stations, emptyStation(drill.stations.length)],
					})
				}
			>
				Add station
			</Button>
		</div>
	);
};
