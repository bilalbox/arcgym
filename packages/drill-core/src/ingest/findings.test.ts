import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	clearIngestFindings,
	findingsRequireGroundingHandoff,
	findingsSidecarPath,
	type IngestFindings,
	writeIngestFindings,
} from "../index.js";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempDrillPath(id: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arcgym-ingest-"));
	tempDirs.push(dir);
	const drillPath = path.join(dir, `${id}.json`);
	fs.writeFileSync(
		drillPath,
		`${JSON.stringify({ id, status: "draft" }, null, 2)}\n`,
	);
	return drillPath;
}

describe("soft ingest findings sidecar", () => {
	it("writes findings next to the draft and leaves the draft in place", () => {
		const drillPath = tempDrillPath("AGD-00999");
		const findings: IngestFindings = {
			drillId: "AGD-00999",
			failedAt: "2026-10-03T00:00:00.000Z",
			reasons: ["wording"],
			wordingFindings: [
				{
					ruleId: "length-tell",
					where: "steps[0].options[0].rationale",
					message: "too long",
				},
			],
		};

		writeIngestFindings(drillPath, findings);

		expect(fs.existsSync(drillPath)).toBe(true);
		const sidecar = findingsSidecarPath(drillPath);
		expect(fs.existsSync(sidecar)).toBe(true);
		expect(JSON.parse(fs.readFileSync(sidecar, "utf-8"))).toEqual(findings);
	});

	it("clears a prior findings sidecar on successful ingest", () => {
		const drillPath = tempDrillPath("AGD-00998");
		writeIngestFindings(drillPath, {
			drillId: "AGD-00998",
			failedAt: "2026-10-03T00:00:00.000Z",
			reasons: ["validation"],
			validationFindings: [
				{
					ruleId: "citation-manifest",
					where: "steps[0].options[0].citationUrl",
					message: "citation missing",
				},
			],
		});

		clearIngestFindings(drillPath);

		expect(fs.existsSync(drillPath)).toBe(true);
		expect(fs.existsSync(findingsSidecarPath(drillPath))).toBe(false);
	});
});

describe("findingsRequireGroundingHandoff", () => {
	it("is true when validationFindings includes a Citation Manifest mismatch", () => {
		const findings: IngestFindings = {
			drillId: "AGD-00994",
			failedAt: "2026-10-03T00:00:00.000Z",
			reasons: ["validation"],
			validationFindings: [
				{
					ruleId: "citation-manifest",
					where: "step s1 option opt-a citationUrl",
					message:
						"correct option opt-a must cite an exact Citation Manifest URL",
				},
			],
		};
		expect(findingsRequireGroundingHandoff(findings)).toBe(true);
	});

	it("is true when validationFindings includes missing-asset", () => {
		const findings: IngestFindings = {
			drillId: "AGD-00995",
			failedAt: "2026-10-03T00:00:00.000Z",
			reasons: ["validation"],
			validationFindings: [
				{
					ruleId: "missing-asset",
					where: "architecture.diagramUrl",
					message: "diagramUrl references missing asset: /diagrams/missing.svg",
				},
			],
		};
		expect(findingsRequireGroundingHandoff(findings)).toBe(true);
	});

	it("is true when redteamFindings include dual-grounding", () => {
		expect(
			findingsRequireGroundingHandoff({
				drillId: "AGD-00990",
				failedAt: "2026-10-03T00:00:00.000Z",
				reasons: ["redteam"],
				redteamFindings: [
					{
						ruleId: "dual-grounding",
						where: "steps[0].options[0].rationale",
						message: "correct option rests on Trailhead, not Citation Manifest",
					},
				],
			}),
		).toBe(true);
	});

	it("is false for wording-only or surgically fixable validation findings", () => {
		expect(
			findingsRequireGroundingHandoff({
				drillId: "AGD-00993",
				failedAt: "2026-10-03T00:00:00.000Z",
				reasons: ["wording"],
				wordingFindings: [
					{
						ruleId: "length-tell",
						where: "steps[0].options[0].rationale",
						message: "too long",
					},
				],
			}),
		).toBe(false);

		expect(
			findingsRequireGroundingHandoff({
				drillId: "AGD-00992",
				failedAt: "2026-10-03T00:00:00.000Z",
				reasons: ["validation"],
				validationFindings: [
					{
						ruleId: "missing-rationale",
						where: "step s1 option opt-b rationale",
						message: "option opt-b is missing rationale",
					},
					{
						ruleId: "missing-distractor-antipattern",
						where: "step s1 option opt-c distractorAntipattern",
						message: "incorrect option opt-c is missing distractorAntipattern",
					},
					{
						ruleId: "option-set",
						where: "step s1 options",
						message: "step s1 has NO correct option marked",
					},
				],
			}),
		).toBe(false);

		expect(
			findingsRequireGroundingHandoff({
				drillId: "AGD-00989",
				failedAt: "2026-10-03T00:00:00.000Z",
				reasons: ["redteam"],
				redteamFindings: [
					{
						ruleId: "giveaway-stem",
						where: "steps[0].prompt",
						message: "stem leaks the correct choice",
					},
				],
			}),
		).toBe(false);
	});
});

describe("redteam findings sidecar", () => {
	it("writes and clears redteam findings via the ingest findings helpers", () => {
		const drillPath = tempDrillPath("AGD-00988");
		const findings: IngestFindings = {
			drillId: "AGD-00988",
			failedAt: "2026-10-03T00:00:00.000Z",
			reasons: ["redteam"],
			redteamFindings: [
				{
					ruleId: "correct-too-obvious",
					where: "steps[0].options[1].text",
					message: "correct option telegraphs via officialese",
				},
				{
					ruleId: "distractor-restates-correct",
					where: "steps[0].options[2].rationale",
					message: "wrong option restates the correct rationale",
				},
			],
		};

		writeIngestFindings(drillPath, findings);

		expect(
			JSON.parse(fs.readFileSync(findingsSidecarPath(drillPath), "utf-8")),
		).toEqual(findings);

		clearIngestFindings(drillPath);
		expect(fs.existsSync(findingsSidecarPath(drillPath))).toBe(false);
	});
});
