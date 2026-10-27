import {
	type DrillDefinitionDTO,
	lintDrillWording,
	type ValidationFinding,
	type WordingFinding,
} from "@arcgym/drill-core";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DrillFeedbackTab } from "@/components/studio/DrillFeedbackTab";
import { JsonHatch } from "@/components/studio/JsonHatch";
import { MetadataForm } from "@/components/studio/MetadataForm";
import { StudioBanner } from "@/components/studio/StudioBanner";
import { ValidationFindings } from "@/components/studio/ValidationFindings";
import { WordingFindings } from "@/components/studio/WordingFindings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWebFormatDescriptor } from "@/formats";
import {
	getStudioDrill,
	getStudioFeedback,
	publishStudioDrill,
	type StudioFeedbackSnapshot,
	saveStudioDrill,
	syncStudioFeedback,
	unpublishStudioDrill,
} from "@/studio/api";
import { setStudioNavBlocker } from "@/studio/navBlock";

type MainTab = "play" | "edit" | "feedback";
type EditMode = "forms" | "json";

interface StudioDrillPageProps {
	drillId: string;
	navigate: (to: string) => void;
}

export const StudioDrillPage: React.FC<StudioDrillPageProps> = ({
	drillId,
	navigate,
}) => {
	const [drill, setDrill] = useState<DrillDefinitionDTO | null>(null);
	const [savedSnapshot, setSavedSnapshot] = useState<string>("");
	const [findings, setFindings] = useState<WordingFinding[]>([]);
	const [validationFindings, setValidationFindings] = useState<
		ValidationFinding[]
	>([]);
	const [feedbackSnapshot, setFeedbackSnapshot] =
		useState<StudioFeedbackSnapshot | null>(null);
	const [syncingFeedback, setSyncingFeedback] = useState(false);
	const [feedbackError, setFeedbackError] = useState<string | null>(null);
	const [tab, setTab] = useState<MainTab>("edit");
	const [editMode, setEditMode] = useState<EditMode>("forms");
	const [playRevision, setPlayRevision] = useState(0);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const dirty = useMemo(() => {
		if (!drill) return false;
		return JSON.stringify(drill) !== savedSnapshot;
	}, [drill, savedSnapshot]);

	const webDescriptor = drill ? getWebFormatDescriptor(drill.format) : null;
	const Runner = webDescriptor?.Runner;
	const Editor = webDescriptor?.Editor;

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		Promise.allSettled([getStudioDrill(drillId), getStudioFeedback()])
			.then(([drillRes, fbRes]) => {
				if (drillRes.status === "fulfilled") {
					const res = drillRes.value;
					setDrill(res.drill);
					setSavedSnapshot(JSON.stringify(res.drill));
					setFindings(res.findings);
					setValidationFindings(res.validationFindings ?? []);
					setPlayRevision((n) => n + 1);
				} else {
					setError(
						drillRes.reason instanceof Error
							? drillRes.reason.message
							: String(drillRes.reason),
					);
				}
				if (fbRes.status === "fulfilled") {
					setFeedbackSnapshot(fbRes.value);
				}
			})
			.finally(() => setLoading(false));
	}, [drillId]);

	const handleSyncFeedback = async () => {
		setSyncingFeedback(true);
		setFeedbackError(null);
		try {
			const fb = await syncStudioFeedback();
			setFeedbackSnapshot(fb);
		} catch (err) {
			setFeedbackError(err instanceof Error ? err.message : String(err));
		} finally {
			setSyncingFeedback(false);
		}
	};

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		setStudioNavBlocker(() => {
			if (!dirty) return true;
			return window.confirm("Discard unsaved changes?");
		});
		return () => setStudioNavBlocker(null);
	}, [dirty]);

	useEffect(() => {
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!dirty) return;
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [dirty]);

	const onDrillChange = (next: DrillDefinitionDTO) => {
		setDrill(next);
		setFindings(lintDrillWording(next));
		setMessage(null);
	};

	const handleSave = async () => {
		if (!drill) return;
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const res = await saveStudioDrill(drill.id, drill);
			setDrill(res.drill);
			setSavedSnapshot(JSON.stringify(res.drill));
			setFindings(res.findings);
			setValidationFindings(res.validationFindings ?? []);
			setPlayRevision((n) => n + 1);
			const totalFindings =
				res.findings.length + (res.validationFindings?.length ?? 0);
			setMessage(
				res.flippedToDraft
					? "Saved as draft (was published)"
					: `Saved · ${totalFindings} finding${totalFindings === 1 ? "" : "s"}`,
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	const handlePublish = async () => {
		if (!drill) return;
		if (dirty) {
			setError("Save before publishing");
			return;
		}
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const res = await publishStudioDrill(drill.id);
			setDrill(res.drill);
			setSavedSnapshot(JSON.stringify(res.drill));
			setFindings(res.findings);
			setValidationFindings(res.validationFindings ?? []);
			const reload = window.confirm(
				"Published and rebuilt the learner catalog. Reload the page so learner routes pick it up?",
			);
			if (reload) window.location.reload();
			else setMessage(`Published · v${res.drill.version}`);
		} catch (err) {
			const e = err as Error & {
				findings?: WordingFinding[];
				validationFindings?: ValidationFinding[];
			};
			if (e.findings) setFindings(e.findings);
			if (e.validationFindings) setValidationFindings(e.validationFindings);
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const handleUnpublish = async () => {
		if (!drill) return;
		if (dirty) {
			setError("Save before unpublishing");
			return;
		}
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const res = await unpublishStudioDrill(drill.id);
			setDrill(res.drill);
			setSavedSnapshot(JSON.stringify(res.drill));
			setFindings(res.findings);
			setValidationFindings(res.validationFindings ?? []);
			const reload = window.confirm(
				"Unpublished and rebuilt the learner catalog. Reload the page?",
			);
			if (reload) window.location.reload();
			else setMessage("Unpublished");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	const switchTab = (next: MainTab) => {
		if (next === "play" && dirty) {
			// Play uses in-memory drill; allow without save
		}
		setTab(next);
		if (next === "play") setPlayRevision((n) => n + 1);
	};

	if (loading) {
		return (
			<>
				<StudioBanner />
				<main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
					<p className="text-sm text-miro-slate">Loading…</p>
				</main>
			</>
		);
	}

	if (error && !drill) {
		return (
			<>
				<StudioBanner />
				<main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-4">
					<p className="text-sm text-miro-dangerText">{error}</p>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => navigate("/dev/drills")}
					>
						Back
					</Button>
				</main>
			</>
		);
	}

	if (!drill) return null;

	const drillStats = feedbackSnapshot?.ratings[drill.id];

	return (
		<>
			<StudioBanner />
			<main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-2 min-w-0">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => navigate("/dev/drills")}
						>
							← Drills
						</Button>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="font-mono text-[11px]">
								{drill.id}
							</Badge>
							<Badge variant="outline" className="text-[11px]">
								{drill.status}
							</Badge>
							<Badge variant="outline" className="text-[11px]">
								v{drill.version}
							</Badge>
							{dirty && (
								<Badge variant="yellow" className="text-[11px]">
									Unsaved
								</Badge>
							)}
							{findings.length > 0 && (
								<Badge variant="destructive" className="text-[11px]">
									{findings.length} finding{findings.length === 1 ? "" : "s"}
								</Badge>
							)}
							{drillStats && drillStats.totalVotes > 0 && (
								<Badge
									variant={
										drillStats.downVotes > 0 &&
										(drillStats.likePercentage === null ||
											drillStats.likePercentage < 70)
											? "destructive"
											: drillStats.likePercentage !== null &&
													drillStats.likePercentage >= 80
												? "success"
												: "outline"
									}
									className="text-[11px]"
								>
									{drillStats.likePercentage !== null
										? `👍 ${drillStats.likePercentage}% (${drillStats.totalVotes})`
										: `👍 ${drillStats.upVotes} · 👎 ${drillStats.downVotes}`}
								</Badge>
							)}
						</div>
						<h1 className="text-xl sm:text-2xl font-medium text-miro-primary tracking-tight">
							{drill.title}
						</h1>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							disabled={busy || !dirty}
							onClick={handleSave}
						>
							Save
						</Button>
						{drill.status === "draft" ? (
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={busy || dirty || findings.length > 0}
								onClick={handlePublish}
							>
								Publish
							</Button>
						) : (
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={busy || dirty}
								onClick={handleUnpublish}
							>
								Unpublish
							</Button>
						)}
					</div>
				</div>

				{(message || error) && (
					<p
						className={`text-sm rounded-md border px-3 py-2 ${
							error
								? "text-miro-dangerText border-miro-dangerBorder bg-miro-dangerLight"
								: "text-miro-slate border-miro-hairline bg-miro-surfaceSoft"
						}`}
					>
						{error ?? message}
					</p>
				)}

				<div className="flex gap-1 border-b border-miro-hairline">
					{(["play", "edit", "feedback"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => switchTab(t)}
							className={`px-4 h-10 text-sm border-b-2 capitalize cursor-pointer ${
								tab === t
									? "border-miro-primary text-miro-primary font-medium"
									: "border-transparent text-miro-muted hover:text-miro-primary"
							}`}
						>
							{t === "feedback" && drillStats && drillStats.totalVotes > 0 ? (
								<span className="flex items-center gap-1.5">
									Feedback
									<span className="text-[10px] px-1.5 py-0.2 rounded-full bg-miro-surfaceSoft text-miro-slate font-mono">
										{drillStats.totalVotes}
									</span>
								</span>
							) : (
								t
							)}
						</button>
					))}
				</div>

				{tab === "play" && drill && Runner && (
					<div className="pt-2">
						<Runner
							key={`${drill.format}-${drill.id}-${playRevision}`}
							drill={drill}
						/>
					</div>
				)}

				{tab === "feedback" && drill && (
					<DrillFeedbackTab
						drillId={drill.id}
						stats={drillStats}
						records={feedbackSnapshot?.records[drill.id]}
						lastSyncedAt={feedbackSnapshot?.lastSyncedAt ?? null}
						onSync={handleSyncFeedback}
						syncing={syncingFeedback}
						error={feedbackError}
					/>
				)}

				{tab === "edit" && (
					<div className="space-y-6 pt-2">
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant={editMode === "forms" ? "default" : "secondary"}
								onClick={() => setEditMode("forms")}
							>
								Forms
							</Button>
							<Button
								type="button"
								size="sm"
								variant={editMode === "json" ? "default" : "secondary"}
								onClick={() => setEditMode("json")}
							>
								JSON
							</Button>
						</div>

						<section className="space-y-2">
							<h2 className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
								Validation
							</h2>
							<ValidationFindings findings={validationFindings} />
						</section>

						<section className="space-y-2">
							<h2 className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
								Wording
							</h2>
							<WordingFindings findings={findings} />
						</section>

						{editMode === "forms" ? (
							<>
								<section className="space-y-2">
									<h2 className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
										Metadata
									</h2>
									<MetadataForm drill={drill} onChange={onDrillChange} />
								</section>
								<section className="space-y-2">
									<h2 className="text-[11px] uppercase tracking-wider text-miro-muted font-medium">
										Content
									</h2>
									{Editor && <Editor drill={drill} onChange={onDrillChange} />}
								</section>
							</>
						) : (
							<JsonHatch drill={drill} onApply={onDrillChange} />
						)}
					</div>
				)}
			</main>
		</>
	);
};

export default StudioDrillPage;
