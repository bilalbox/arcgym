/**
 * Local-dev-only filesystem bridge for the drill studio.
 * Mounted via Vite configureServer — never ships to Cloudflare Pages.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";
import {
	calculateRatingStats,
	citationManifestUrlsFromExports,
	type DrillDefinitionDTO,
	type DrillFeedbackTag,
	type DrillRatingStats,
	type DrillStatus,
	type GroundingChunkExport,
	isTroubleshootingDrill,
	lintDrillWording,
	MAX_CAUSE_CHARS,
	StubCauseGrader,
	sanitizeFeedbackTags,
	type TroubleshootingDrillDefinition,
	type ValidationFinding,
	validateDrill,
	type WordingFinding,
} from "../../../packages/drill-core/src/index.js";

const execFileAsync = promisify(execFile);

const STUDIO_PREFIX = "/__studio";

interface ChunkIndexEntry {
	url: string;
	title: string;
}

interface DrillListItem {
	id: string;
	title: string;
	format: DrillDefinitionDTO["format"];
	domain: DrillDefinitionDTO["domain"];
	domainLabel: string;
	difficulty: DrillDefinitionDTO["difficulty"];
	status: DrillStatus;
	version: number;
	sourceCardIds?: string[];
	findingCount: number;
}

function isLocalAddress(addr: string | undefined): boolean {
	if (!addr) return false;
	return (
		addr === "127.0.0.1" ||
		addr === "::1" ||
		addr === "::ffff:127.0.0.1" ||
		addr === "localhost"
	);
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
		req.on("error", reject);
	});
}

function drillPath(drillsDir: string, id: string): string {
	return path.join(drillsDir, `${id.toUpperCase()}.json`);
}

function feedbackPath(repoRoot: string): string {
	return path.join(repoRoot, "data/feedback.json");
}

function readFeedbackSnapshot(repoRoot: string): {
	lastSyncedAt: string | null;
	ratings: Record<string, unknown>;
	records: Record<string, unknown[]>;
} {
	const fp = feedbackPath(repoRoot);
	if (!fs.existsSync(fp)) {
		return {
			lastSyncedAt: null,
			ratings: {},
			records: {},
		};
	}
	try {
		const raw = fs.readFileSync(fp, "utf-8");
		const parsed = JSON.parse(raw);
		return {
			lastSyncedAt:
				typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
			ratings:
				parsed.ratings && typeof parsed.ratings === "object"
					? parsed.ratings
					: {},
			records:
				parsed.records && typeof parsed.records === "object"
					? parsed.records
					: {},
		};
	} catch {
		return {
			lastSyncedAt: null,
			ratings: {},
			records: {},
		};
	}
}

function readDrill(drillsDir: string, id: string): DrillDefinitionDTO | null {
	const filePath = drillPath(drillsDir, id);
	if (!fs.existsSync(filePath)) return null;
	return JSON.parse(fs.readFileSync(filePath, "utf-8")) as DrillDefinitionDTO;
}

function writeDrill(drillsDir: string, drill: DrillDefinitionDTO): void {
	const filePath = drillPath(drillsDir, drill.id);
	fs.writeFileSync(filePath, `${JSON.stringify(drill, null, 2)}\n`, "utf-8");
}

function listDrills(
	drillsDir: string,
	includePublished: boolean,
): DrillListItem[] {
	const files = fs
		.readdirSync(drillsDir)
		.filter((f) => f.endsWith(".json") && !f.endsWith(".findings.json"));
	const items: DrillListItem[] = [];

	for (const file of files) {
		const drill = JSON.parse(
			fs.readFileSync(path.join(drillsDir, file), "utf-8"),
		) as DrillDefinitionDTO;
		if (!includePublished && drill.status !== "draft") continue;
		const findings = lintDrillWording(drill);
		items.push({
			id: drill.id,
			title: drill.title,
			format: drill.format,
			domain: drill.domain,
			domainLabel: drill.domainLabel,
			difficulty: drill.difficulty,
			status: drill.status,
			version: drill.version,
			sourceCardIds: drill.sourceCardIds,
			findingCount: findings.length,
		});
	}

	items.sort((a, b) => {
		if (a.status !== b.status) return a.status === "draft" ? -1 : 1;
		if (b.findingCount !== a.findingCount)
			return b.findingCount - a.findingCount;
		return a.id.localeCompare(b.id);
	});

	return items;
}

/** Save never publishes — published drills flip to draft; drafts stay draft. */
function prepareForSave(incoming: DrillDefinitionDTO): DrillDefinitionDTO {
	return {
		...incoming,
		status: "draft",
	};
}

function prepareForPublish(drill: DrillDefinitionDTO): DrillDefinitionDTO {
	return {
		...drill,
		status: "published",
		version: (typeof drill.version === "number" ? drill.version : 0) + 1,
	};
}

async function runBuildDrills(
	repoRoot: string,
): Promise<{ ok: boolean; output: string }> {
	try {
		const { stdout, stderr } = await execFileAsync("pnpm", ["build:drills"], {
			cwd: repoRoot,
			maxBuffer: 10 * 1024 * 1024,
		});
		return { ok: true, output: `${stdout}\n${stderr}`.trim() };
	} catch (err) {
		const e = err as { stdout?: string; stderr?: string; message?: string };
		return {
			ok: false,
			output:
				`${e.stdout ?? ""}\n${e.stderr ?? e.message ?? String(err)}`.trim(),
		};
	}
}

function loadChunkIndex(chunksPath: string): ChunkIndexEntry[] {
	if (!fs.existsSync(chunksPath)) return [];
	const raw = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as Array<{
		metadata?: { url?: string; doc_title?: string; section_title?: string };
	}>;
	const seen = new Set<string>();
	const entries: ChunkIndexEntry[] = [];
	for (const chunk of raw) {
		const url = chunk.metadata?.url;
		if (!url || seen.has(url)) continue;
		seen.add(url);
		const title =
			[chunk.metadata?.doc_title, chunk.metadata?.section_title]
				.filter(Boolean)
				.join(" › ") || url;
		entries.push({ url, title });
	}
	return entries;
}

function loadAllChunkIndexes(repoRoot: string): ChunkIndexEntry[] {
	const exports = [
		"data/architect_chunks.json",
		"data/developer_chunks.json",
		"data/help_chunks.json",
	];
	const seen = new Set<string>();
	const entries: ChunkIndexEntry[] = [];
	for (const rel of exports) {
		for (const entry of loadChunkIndex(path.join(repoRoot, rel))) {
			if (seen.has(entry.url)) continue;
			seen.add(entry.url);
			entries.push(entry);
		}
	}
	return entries;
}

function loadCitationManifestUrls(repoRoot: string): Set<string> {
	const exports = [
		"data/architect_chunks.json",
		"data/developer_chunks.json",
		"data/help_chunks.json",
	];
	const chunksList: GroundingChunkExport[][] = [];
	for (const rel of exports) {
		const p = path.join(repoRoot, rel);
		if (fs.existsSync(p)) {
			chunksList.push(JSON.parse(fs.readFileSync(p, "utf-8")));
		}
	}
	return citationManifestUrlsFromExports(chunksList);
}

export function studioFsPlugin(repoRoot: string, publicDir: string): Plugin {
	const drillsDir = path.join(repoRoot, "content/drills");
	let chunkIndex: ChunkIndexEntry[] | null = null;
	let citationManifest: Set<string> | null = null;

	const getCitationManifest = () => {
		if (!citationManifest) {
			citationManifest = loadCitationManifestUrls(repoRoot);
		}
		return citationManifest;
	};

	const assetExists = (diagramPath: string) => {
		if (!diagramPath.startsWith("/") || diagramPath.includes(".."))
			return false;
		const abs = path.join(publicDir, diagramPath.replace(/^\//, ""));
		return abs.startsWith(publicDir) && fs.existsSync(abs);
	};

	return {
		name: "arcgym-studio-fs",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url ?? "";
				const parsed = new URL(url, "http://localhost");
				const pathname = parsed.pathname;

				if (pathname === "/api/troubleshoot/grade" && req.method === "POST") {
					if (!isLocalAddress(req.socket.remoteAddress)) {
						sendJson(res, 403, { error: "API is localhost-only" });
						return;
					}
					try {
						const rawBody = await readBody(req);
						let body: unknown;
						try {
							body = JSON.parse(rawBody);
						} catch {
							sendJson(res, 400, { error: "Invalid JSON body" });
							return;
						}

						if (!body || typeof body !== "object" || Array.isArray(body)) {
							sendJson(res, 400, { error: "Invalid JSON body" });
							return;
						}

						const drillId = String(
							(body as { drillId?: unknown }).drillId ?? "",
						)
							.trim()
							.toUpperCase();
						const causeText = String(
							(body as { causeText?: unknown }).causeText ?? "",
						).trim();
						if (!drillId) {
							sendJson(res, 400, { error: "Invalid drill ID" });
							return;
						}
						if (!causeText || causeText.length > MAX_CAUSE_CHARS) {
							sendJson(res, 400, { error: "causeText is required" });
							return;
						}

						const drill = readDrill(drillsDir, drillId);
						if (!drill || !isTroubleshootingDrill(drill)) {
							sendJson(res, 404, { error: "Unknown troubleshooting drill" });
							return;
						}
						const incident = drill as TroubleshootingDrillDefinition;
						const fixOptions = incident.fix?.options;
						if (
							!Array.isArray(fixOptions) ||
							fixOptions.length !== 3 ||
							fixOptions.filter((o) => o.isCorrect).length !== 1
						) {
							sendJson(res, 422, {
								error: "Incident is missing a valid Fix definition",
							});
							return;
						}

						const grader = new StubCauseGrader();
						const result = await grader.grade({ drill: incident, causeText });
						sendJson(res, 200, { ...result, fix: incident.fix });
						return;
					} catch (err) {
						sendJson(res, 500, {
							error: err instanceof Error ? err.message : String(err),
						});
						return;
					}
				}

				if (pathname === "/api/learner/sync") {
					if (!isLocalAddress(req.socket.remoteAddress)) {
						sendJson(res, 403, { error: "API is localhost-only" });
						return;
					}
					if (req.method === "GET") {
						sendJson(res, 200, { authenticated: false, progress: null });
						return;
					}
					if (req.method === "POST") {
						const rawBody = await readBody(req);
						let body: unknown = null;
						try {
							body = JSON.parse(rawBody);
						} catch {
							// ignore
						}
						sendJson(res, 200, { authenticated: false, progress: body });
						return;
					}
				}

				if (pathname === "/api/auth/status" && req.method === "GET") {
					sendJson(res, 200, { authenticated: false });
					return;
				}

				if (
					(pathname === "/api/auth/logout" ||
						pathname === "/api/learner/delete") &&
					req.method === "POST"
				) {
					sendJson(res, 200, { success: true });
					return;
				}

				const drillFeedbackMatch = pathname.match(
					/^\/api\/drills\/([^/]+)\/(feedback|rating)$/,
				);
				if (drillFeedbackMatch) {
					if (!isLocalAddress(req.socket.remoteAddress)) {
						sendJson(res, 403, { error: "API is localhost-only" });
						return;
					}
					const drillIdRaw = drillFeedbackMatch[1];
					const subroute = drillFeedbackMatch[2];
					if (drillIdRaw === undefined || subroute === undefined) {
						sendJson(res, 404, { error: "Not found" });
						return;
					}
					const drillId = decodeURIComponent(drillIdRaw).toUpperCase();
					const snapshot = readFeedbackSnapshot(repoRoot);
					const ratingStats =
						(snapshot.ratings as Record<string, DrillRatingStats>)[drillId] ||
						calculateRatingStats(drillId, 0, 0, {});

					if (subroute === "rating" && req.method === "GET") {
						sendJson(res, 200, ratingStats);
						return;
					}

					if (subroute === "feedback" && req.method === "POST") {
						const rawBody = await readBody(req);
						let body: { rating?: "up" | "down"; tags?: unknown } = {};
						try {
							body = JSON.parse(rawBody);
						} catch {
							// ignore
						}
						const rating = body.rating === "down" ? "down" : "up";
						const nextUp = ratingStats.upVotes + (rating === "up" ? 1 : 0);
						const nextDown =
							ratingStats.downVotes + (rating === "down" ? 1 : 0);
						const sanitizedTags = sanitizeFeedbackTags(rating, body.tags);
						const updatedTagCounts: Partial<Record<DrillFeedbackTag, number>> =
							{
								...(ratingStats.tagCounts || {}),
							};
						for (const t of sanitizedTags) {
							updatedTagCounts[t] = (updatedTagCounts[t] || 0) + 1;
						}
						const newStats = calculateRatingStats(
							drillId,
							nextUp,
							nextDown,
							updatedTagCounts,
						);
						sendJson(res, 200, { success: true, stats: newStats });
						return;
					}
				}

				if (!url.startsWith(STUDIO_PREFIX)) {
					next();
					return;
				}

				if (!isLocalAddress(req.socket.remoteAddress)) {
					sendJson(res, 403, { error: "Studio API is localhost-only" });
					return;
				}

				try {
					if (req.method === "GET" && pathname === `${STUDIO_PREFIX}/drills`) {
						const includePublished =
							parsed.searchParams.get("includePublished") === "1";
						sendJson(res, 200, {
							drills: listDrills(drillsDir, includePublished),
						});
						return;
					}

					if (req.method === "GET" && pathname === `${STUDIO_PREFIX}/chunks`) {
						const q = (parsed.searchParams.get("q") ?? "").trim().toLowerCase();
						if (!chunkIndex) chunkIndex = loadAllChunkIndexes(repoRoot);
						const matches = !q
							? []
							: chunkIndex
									.filter(
										(c) =>
											c.title.toLowerCase().includes(q) ||
											c.url.toLowerCase().includes(q),
									)
									.slice(0, 30);
						sendJson(res, 200, { chunks: matches });
						return;
					}

					if (
						req.method === "GET" &&
						pathname === `${STUDIO_PREFIX}/diagram-exists`
					) {
						const diagramPath = parsed.searchParams.get("path") ?? "";
						if (!diagramPath.startsWith("/") || diagramPath.includes("..")) {
							sendJson(res, 400, { exists: false, error: "Invalid path" });
							return;
						}
						const abs = path.join(publicDir, diagramPath.replace(/^\//, ""));
						const exists = abs.startsWith(publicDir) && fs.existsSync(abs);
						sendJson(res, 200, { exists });
						return;
					}

					if (
						req.method === "GET" &&
						pathname === `${STUDIO_PREFIX}/feedback`
					) {
						sendJson(res, 200, readFeedbackSnapshot(repoRoot));
						return;
					}

					if (
						req.method === "POST" &&
						pathname === `${STUDIO_PREFIX}/feedback/sync`
					) {
						try {
							const { stdout, stderr } = await execFileAsync(
								"pnpm",
								["feedback:pull"],
								{
									cwd: repoRoot,
									maxBuffer: 10 * 1024 * 1024,
								},
							);
							const snapshot = readFeedbackSnapshot(repoRoot);
							sendJson(res, 200, {
								...snapshot,
								output: `${stdout}\n${stderr}`.trim(),
							});
							return;
						} catch (err) {
							const e = err as {
								stdout?: string;
								stderr?: string;
								message?: string;
							};
							sendJson(res, 500, {
								error: `Failed to sync feedback: ${e.stderr || e.message || String(err)}`,
							});
							return;
						}
					}

					const drillMatch = pathname.match(
						new RegExp(
							`^${STUDIO_PREFIX}/drills/([^/]+)(?:/(publish|unpublish))?$`,
						),
					);
					if (!drillMatch) {
						sendJson(res, 404, { error: "Not found" });
						return;
					}

					const drillIdRaw = drillMatch[1];
					if (drillIdRaw === undefined) {
						sendJson(res, 404, { error: "Not found" });
						return;
					}
					const drillId = decodeURIComponent(drillIdRaw).toUpperCase();
					const action = drillMatch[2] as "publish" | "unpublish" | undefined;

					if (req.method === "GET" && !action) {
						const drill = readDrill(drillsDir, drillId);
						if (!drill) {
							sendJson(res, 404, { error: `Drill ${drillId} not found` });
							return;
						}
						const vRes = validateDrill(drill, {
							citationManifest: getCitationManifest(),
							assetExists,
						});
						const validationFindings = vRes.ok ? [] : vRes.findings;
						const findings = lintDrillWording(drill);
						sendJson(res, 200, { drill, findings, validationFindings });
						return;
					}

					if (req.method === "PUT" && !action) {
						const raw = await readBody(req);
						let incoming: DrillDefinitionDTO;
						try {
							incoming = JSON.parse(raw) as DrillDefinitionDTO;
						} catch {
							sendJson(res, 400, { error: "Invalid JSON body" });
							return;
						}
						if (String(incoming.id).toUpperCase() !== drillId) {
							sendJson(res, 400, { error: "Body id must match URL id" });
							return;
						}
						const existing = readDrill(drillsDir, drillId);
						if (!existing) {
							sendJson(res, 404, { error: `Drill ${drillId} not found` });
							return;
						}
						const saved = prepareForSave(incoming);
						saved.id = drillId;
						writeDrill(drillsDir, saved);
						const vRes = validateDrill(saved, {
							citationManifest: getCitationManifest(),
							assetExists,
						});
						const validationFindings = vRes.ok ? [] : vRes.findings;
						const findings = lintDrillWording(saved);
						sendJson(res, 200, {
							drill: saved,
							findings,
							validationFindings,
							flippedToDraft: existing.status === "published",
						});
						return;
					}

					if (req.method === "POST" && action === "publish") {
						const existing = readDrill(drillsDir, drillId);
						if (!existing) {
							sendJson(res, 404, { error: `Drill ${drillId} not found` });
							return;
						}
						const vRes = validateDrill(existing, {
							citationManifest: getCitationManifest(),
							assetExists,
						});
						if (!vRes.ok) {
							sendJson(res, 400, {
								error: "Validation findings block publish",
								validationFindings: vRes.findings,
								findings: lintDrillWording(existing),
							});
							return;
						}
						const findings = lintDrillWording(existing);
						if (findings.length > 0) {
							sendJson(res, 400, {
								error: "Wording findings block publish",
								validationFindings: [],
								findings,
							});
							return;
						}
						const published = prepareForPublish(existing);
						writeDrill(drillsDir, published);
						const build = await runBuildDrills(repoRoot);
						if (!build.ok) {
							// Roll status back so disk matches failure
							writeDrill(drillsDir, existing);
							sendJson(res, 500, {
								error: "build:drills failed; publish rolled back",
								output: build.output,
							});
							return;
						}
						sendJson(res, 200, {
							drill: published,
							findings: [] as WordingFinding[],
							validationFindings: [] as ValidationFinding[],
							reloadRequired: true,
							buildOutput: build.output,
						});
						return;
					}

					if (req.method === "POST" && action === "unpublish") {
						const existing = readDrill(drillsDir, drillId);
						if (!existing) {
							sendJson(res, 404, { error: `Drill ${drillId} not found` });
							return;
						}
						const unpublished: DrillDefinitionDTO = {
							...existing,
							status: "draft",
						};
						writeDrill(drillsDir, unpublished);
						const build = await runBuildDrills(repoRoot);
						if (!build.ok) {
							writeDrill(drillsDir, existing);
							sendJson(res, 500, {
								error: "build:drills failed; unpublish rolled back",
								output: build.output,
							});
							return;
						}
						const vRes = validateDrill(unpublished, {
							citationManifest: getCitationManifest(),
							assetExists,
						});
						sendJson(res, 200, {
							drill: unpublished,
							findings: lintDrillWording(unpublished),
							validationFindings: vRes.ok ? [] : vRes.findings,
							reloadRequired: true,
							buildOutput: build.output,
						});
						return;
					}

					sendJson(res, 405, { error: "Method not allowed" });
				} catch (err) {
					sendJson(res, 500, {
						error: err instanceof Error ? err.message : String(err),
					});
				}
			});
		},
	};
}
