import { describe, expect, it } from "vitest";
import {
	type CaseFileDrillDefinition,
	type TroubleshootingDrillDefinition,
	type ValidationContext,
	validateDrill,
} from "../index.js";

const VALID_CITATION =
	"https://architect.salesforce.com/well-architected/principles";

function minimalCaseFile(): CaseFileDrillDefinition {
	return {
		id: "AGD-00201",
		title: "Minimal Case File Title",
		domain: "Platform_Core",
		domainLabel: "Platform Core",
		difficulty: "Lead_CTA",
		pillars: ["Reliability"],
		version: 1,
		status: "draft",
		format: "Case_File",
		brief: {
			title: "Enterprise Brief",
			synopsis: "Evaluation brief synopsis",
		},
		stations: [
			{
				id: "st1",
				domain: "Platform_Core",
				boardDomain: "Integration",
				prompt: "Station 1 prompt",
				probeBudget: 2,
				probes: [
					{ id: "p1", label: "Q1?", tier: "pivotal", answer: "A1" },
					{ id: "p2", label: "Q2?", tier: "pivotal", answer: "A2" },
					{ id: "p3", label: "Q3?", tier: "useful", answer: "A3" },
					{ id: "p4", label: "Q4?", tier: "useful", answer: "A4" },
					{
						id: "p5",
						label: "Q5?",
						tier: "distractor",
						answer: "A5",
						distractorAntipattern: "Distract",
					},
				],
				options: [
					{
						id: "opt_1",
						label: "Station recommendation 1",
						isCorrect: true,
						rationale: "Rec rationale",
						citationUrl: VALID_CITATION,
					},
					{
						id: "opt_2",
						label: "Station recommendation 2",
						isCorrect: false,
						distractorAntipattern: "Bad approach",
						rationale: "Why it fails",
					},
				],
			},
			{
				id: "st2",
				domain: "Data_Architecture",
				boardDomain: "Data",
				prompt: "Station 2 prompt",
				probeBudget: 2,
				probes: [
					{ id: "p1", label: "Q1?", tier: "pivotal", answer: "A1" },
					{ id: "p2", label: "Q2?", tier: "pivotal", answer: "A2" },
					{ id: "p3", label: "Q3?", tier: "useful", answer: "A3" },
					{ id: "p4", label: "Q4?", tier: "useful", answer: "A4" },
					{
						id: "p5",
						label: "Q5?",
						tier: "distractor",
						answer: "A5",
						distractorAntipattern: "Distract",
					},
				],
				options: [
					{
						id: "opt_1",
						label: "Station recommendation 1",
						isCorrect: true,
						rationale: "Rec rationale",
						citationUrl: VALID_CITATION,
					},
					{
						id: "opt_2",
						label: "Station recommendation 2",
						isCorrect: false,
						distractorAntipattern: "Bad approach",
						rationale: "Why it fails",
					},
				],
			},
			{
				id: "st3",
				domain: "Security_And_Access",
				boardDomain: "Security",
				prompt: "Station 3 prompt",
				probeBudget: 2,
				probes: [
					{ id: "p1", label: "Q1?", tier: "pivotal", answer: "A1" },
					{ id: "p2", label: "Q2?", tier: "pivotal", answer: "A2" },
					{ id: "p3", label: "Q3?", tier: "useful", answer: "A3" },
					{ id: "p4", label: "Q4?", tier: "useful", answer: "A4" },
					{
						id: "p5",
						label: "Q5?",
						tier: "distractor",
						answer: "A5",
						distractorAntipattern: "Distract",
					},
				],
				options: [
					{
						id: "opt_1",
						label: "Station recommendation 1",
						isCorrect: true,
						rationale: "Rec rationale",
						citationUrl: VALID_CITATION,
					},
					{
						id: "opt_2",
						label: "Station recommendation 2",
						isCorrect: false,
						distractorAntipattern: "Bad approach",
						rationale: "Why it fails",
					},
				],
			},
		],
	};
}

function minimalTroubleshooting(): TroubleshootingDrillDefinition {
	return {
		id: "AGD-00301",
		title: "Minimal Troubleshooting Title",
		domain: "Platform_Core",
		domainLabel: "Platform Core",
		difficulty: "Lead_CTA",
		pillars: ["Operational_Excellence"],
		version: 1,
		status: "draft",
		format: "Troubleshooting",
		architecture: {
			synopsis: "Topology synopsis",
			diagramUrl: "/diagrams/test-topology.svg",
		},
		issue: "Failure symptom description",
		probeBudget: 3,
		probes: [
			{ id: "p1", label: "Q1?", tier: "pivotal", answer: "A1" },
			{ id: "p2", label: "Q2?", tier: "pivotal", answer: "A2" },
			{ id: "p3", label: "Q3?", tier: "useful", answer: "A3" },
			{
				id: "p4",
				label: "Q4?",
				tier: "distractor",
				answer: "A4",
				distractorAntipattern: "Distract",
			},
			{ id: "p5", label: "Q5?", tier: "useful", answer: "A5" },
		],
		goldCause: {
			text: "Root cause text",
			rationale: "Why root cause holds",
			citationUrl: VALID_CITATION,
		},
		hiddenDistractors: [
			{
				id: "d1",
				text: "Wrong cause 1",
				antipattern: "Antipattern 1",
				rationale: "Fails 1",
			},
			{
				id: "d2",
				text: "Wrong cause 2",
				antipattern: "Antipattern 2",
				rationale: "Fails 2",
			},
			{
				id: "d3",
				text: "Wrong cause 3",
				antipattern: "Antipattern 3",
				rationale: "Fails 3",
			},
		],
		fix: {
			prompt: "Select architectural remediation:",
			options: [
				{
					id: "fix_1",
					label: "Fix option 1",
					rationale: "Why fix holds",
					isCorrect: true,
					citationUrl: VALID_CITATION,
				},
				{
					id: "fix_2",
					label: "Fix option 2",
					rationale: "Why it fails",
					isCorrect: false,
					distractorAntipattern: "Antipattern A",
				},
				{
					id: "fix_3",
					label: "Fix option 3",
					rationale: "Why it fails",
					isCorrect: false,
					distractorAntipattern: "Antipattern B",
				},
			],
		},
	};
}

function asMutable(obj: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

const manifestCtx: ValidationContext = {
	citationManifest: new Set([VALID_CITATION]),
	assetExists: () => true,
};

describe("validateDrill fixtures", () => {
	it("validates minimal Case File fixture successfully", () => {
		const res = validateDrill(minimalCaseFile(), manifestCtx);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.drill.id).toBe("AGD-00201");
			expect(res.drill.format).toBe("Case_File");
		}
	});

	it("validates minimal Troubleshooting fixture successfully", () => {
		const res = validateDrill(minimalTroubleshooting(), manifestCtx);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.drill.id).toBe("AGD-00301");
			expect(res.drill.format).toBe("Troubleshooting");
		}
	});
});

describe("validateDrill ruleId coverage", () => {
	it("detects missing-field", () => {
		const raw = asMutable(minimalCaseFile());
		delete raw.title;
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({ ruleId: "missing-field", where: "title" }),
			);
		}
	});

	it("detects invalid-enum at domain", () => {
		const raw = asMutable(minimalCaseFile());
		raw.domain = "Invalid_Domain_Name";
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({ ruleId: "invalid-enum", where: "domain" }),
			);
		}
	});

	it("detects option-set on fewer than 2 options or missing correct option", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const onlyOption = (station0.options as unknown[])[0];
		if (!onlyOption) throw new Error("fixture");
		station0.options = [onlyOption]; // only 1 option
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "option-set",
					where: "station st1 options",
				}),
			);
		}

		const noCorrect = asMutable(minimalCaseFile());
		const noCorrectStations = noCorrect.stations as Array<
			Record<string, unknown>
		>;
		const noCorrectStation0 = noCorrectStations[0];
		if (!noCorrectStation0) throw new Error("fixture");
		const opts = noCorrectStation0.options as Array<Record<string, unknown>>;
		const opt0 = opts[0];
		if (!opt0) throw new Error("fixture");
		opt0.isCorrect = false;
		opt0.distractorAntipattern = "Antipattern";
		const res2 = validateDrill(noCorrect, manifestCtx);
		expect(res2.ok).toBe(false);
		if (!res2.ok) {
			expect(res2.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "option-set",
					where: "station st1 options",
				}),
			);
		}
	});

	it("detects missing-rationale", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const opts = station0.options as Array<Record<string, unknown>>;
		const opt0 = opts[0];
		if (!opt0) throw new Error("fixture");
		opt0.rationale = "";
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-rationale",
					where: "station st1 option opt_1 rationale",
				}),
			);
		}
	});

	it("detects missing-distractor-antipattern on incorrect option or distractor probe", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const opts = station0.options as Array<Record<string, unknown>>;
		const opt1 = opts[1];
		if (!opt1) throw new Error("fixture");
		delete opt1.distractorAntipattern;
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-distractor-antipattern",
					where: "station st1 option opt_2 distractorAntipattern",
				}),
			);
		}

		const rawCf = asMutable(minimalCaseFile());
		const cfStations = rawCf.stations as Array<Record<string, unknown>>;
		const cfStation0 = cfStations[0];
		if (!cfStation0) throw new Error("fixture");
		const probes = cfStation0.probes as Array<Record<string, unknown>>;
		const probe4 = probes[4];
		if (!probe4) throw new Error("fixture");
		delete probe4.distractorAntipattern;
		const resCf = validateDrill(rawCf, manifestCtx);
		expect(resCf.ok).toBe(false);
		if (!resCf.ok) {
			expect(resCf.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-distractor-antipattern",
					where: "station st1 probe p5 distractorAntipattern",
				}),
			);
		}
	});

	it("detects probe-pool violations", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const probes = station0.probes as Array<Record<string, unknown>>;
		probes.pop(); // now 4 probes (minimum 5)
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "probe-pool",
					where: "station st1 probes",
				}),
			);
		}
	});

	it("detects station-set violations", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		stations.pop(); // now 2 stations (minimum 3)
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({ ruleId: "station-set", where: "stations" }),
			);
		}
	});

	it("detects hidden-distractors violations", () => {
		const raw = asMutable(minimalTroubleshooting());
		const distractors = raw.hiddenDistractors as Array<Record<string, unknown>>;
		distractors.pop(); // now 2 hidden distractors (exactly 3 required)
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "hidden-distractors",
					where: "hiddenDistractors",
				}),
			);
		}
	});

	it("detects fix-options violations in Troubleshooting drills", () => {
		const rawNoFix = asMutable(minimalTroubleshooting());
		delete rawNoFix.fix;
		const resNoFix = validateDrill(rawNoFix, manifestCtx);
		expect(resNoFix.ok).toBe(false);
		if (!resNoFix.ok) {
			expect(resNoFix.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-field",
					where: "fix.options",
				}),
			);
		}

		const rawBadFix = asMutable(minimalTroubleshooting());
		const fix = rawBadFix.fix as { options: Array<Record<string, unknown>> };
		fix.options.pop(); // only 2 options instead of 3
		const resBadFix = validateDrill(rawBadFix, manifestCtx);
		expect(resBadFix.ok).toBe(false);
		if (!resBadFix.ok) {
			expect(resBadFix.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "fix-options",
					where: "fix.options",
				}),
			);
		}
	});

	it("detects citation-manifest violations when manifest is provided", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const opts = station0.options as Array<Record<string, unknown>>;
		const opt0 = opts[0];
		if (!opt0) throw new Error("fixture");
		opt0.citationUrl = "https://architect.salesforce.com/not-in-manifest";
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "citation-manifest",
					where: "station st1 option opt_1 citationUrl",
				}),
			);
		}
	});

	it("detects missing-asset when assetExists returns false or invalid path format", () => {
		const raw = asMutable(minimalTroubleshooting());
		const arch = raw.architecture as Record<string, unknown>;
		arch.diagramUrl = "relative/path.svg";
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-asset",
					where: "architecture.diagramUrl",
				}),
			);
		}

		const rawMissing = asMutable(minimalTroubleshooting());
		const resMissing = validateDrill(rawMissing, {
			citationManifest: new Set([VALID_CITATION]),
			assetExists: () => false,
		});
		expect(resMissing.ok).toBe(false);
		if (!resMissing.ok) {
			expect(resMissing.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-asset",
					where: "architecture.diagramUrl",
				}),
			);
		}
	});

	it("accepts self-contained diagramSource without diagramUrl", () => {
		const raw = asMutable(minimalTroubleshooting());
		const arch = raw.architecture as Record<string, unknown>;
		delete arch.diagramUrl;
		arch.diagramSource = "flowchart LR\n  A --> B";
		const res = validateDrill(raw, {
			...manifestCtx,
			validateMermaid: () => ({ valid: true }),
		});
		expect(res.ok).toBe(true);
	});

	it("flags missing-field when both diagramSource and diagramUrl are omitted", () => {
		const raw = asMutable(minimalTroubleshooting());
		const arch = raw.architecture as Record<string, unknown>;
		delete arch.diagramUrl;
		delete arch.diagramSource;
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "missing-field",
					where: "architecture.diagramSource",
				}),
			);
		}
	});

	it("flags invalid-diagram when validateMermaid fails", () => {
		const raw = asMutable(minimalTroubleshooting());
		const arch = raw.architecture as Record<string, unknown>;
		delete arch.diagramUrl;
		arch.diagramSource = "invalid mermaid source";
		const res = validateDrill(raw, {
			...manifestCtx,
			validateMermaid: () => ({ valid: false, error: "Syntax error" }),
		});
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "invalid-diagram",
					where: "architecture.diagramSource",
				}),
			);
		}
	});
});

describe("validateDrill context & short-circuit behavior", () => {
	it("stops validation on top-level failure (returns only top-level findings)", () => {
		const raw = asMutable(minimalCaseFile());
		raw.domain = "Invalid_Domain";
		raw.stations = []; // would produce station-set if not stopped
		const res = validateDrill(raw, manifestCtx);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.findings.length).toBe(1);
			expect(res.findings[0]).toEqual(
				expect.objectContaining({ ruleId: "invalid-enum", where: "domain" }),
			);
		}
	});

	it("falls back to host allowlist when citationManifest is absent", () => {
		const raw = asMutable(minimalCaseFile());
		const stations = raw.stations as Array<Record<string, unknown>>;
		const station0 = stations[0];
		if (!station0) throw new Error("fixture");
		const opts = station0.options as Array<Record<string, unknown>>;
		const opt0 = opts[0];
		if (!opt0) throw new Error("fixture");
		// Allowlisted host not in manifest
		opt0.citationUrl = "https://help.salesforce.com/some/article";
		const res = validateDrill(raw, {});
		expect(res.ok).toBe(true);

		// Non-allowlisted host rejected
		opt0.citationUrl = "https://external-blog.com/post";
		const res2 = validateDrill(raw, {});
		expect(res2.ok).toBe(false);
		if (!res2.ok) {
			expect(res2.findings).toContainEqual(
				expect.objectContaining({
					ruleId: "citation-manifest",
					where: "station st1 option opt_1 citationUrl",
				}),
			);
		}
	});

	it("produces no missing-asset findings when assetExists is absent", () => {
		const raw = minimalTroubleshooting();
		const res = validateDrill(raw, {
			citationManifest: new Set([VALID_CITATION]),
		});
		expect(res.ok).toBe(true);
	});
});
