import { describe, expect, it } from "vitest";
import type {
	CaseFileDrillDefinition,
	DrillAttemptRecord,
	DrillDefinitionDTO,
	TroubleshootingDrillDefinition,
} from "../types/drill.js";
import {
	calculateProficiencyReport,
	countProbeDrivenRevisions,
	getDrillQuestionCount,
} from "./aggregator.js";

const mockCaseFile1: CaseFileDrillDefinition = {
	id: "CF-001",
	title: "Data Cloud Federation",
	format: "Case_File",
	domain: "Data_Architecture",
	domainLabel: "Data 360",
	difficulty: "Lead_CTA",
	pillars: ["Reliability", "Cost_Optimization"],
	version: 1,
	status: "published",
	brief: {
		title: "Data Cloud Federation Brief",
		synopsis: "Synopsis",
	},
	stations: [
		{
			id: "st1",
			domain: "Data_Architecture",
			boardDomain: "Data",
			prompt: "Station 1",
			probeBudget: 2,
			probes: [],
			options: [
				{ id: "o1", label: "Option 1", isCorrect: true, rationale: "r1" },
				{ id: "o2", label: "Option 2", isCorrect: false, rationale: "r2" },
			],
		},
		{
			id: "st2",
			domain: "Data_Architecture",
			boardDomain: "Data",
			prompt: "Station 2",
			probeBudget: 2,
			probes: [],
			options: [
				{ id: "o3", label: "Option 3", isCorrect: true, rationale: "r3" },
			],
		},
		{
			id: "st3",
			domain: "Data_Architecture",
			boardDomain: "Data",
			prompt: "Station 3",
			probeBudget: 2,
			probes: [],
			options: [
				{ id: "o4", label: "Option 4", isCorrect: true, rationale: "r4" },
			],
		},
	],
};

const mockCaseFile2: CaseFileDrillDefinition = {
	id: "CF-002",
	title: "Platform Event Architecture",
	format: "Case_File",
	domain: "Integration_Apis",
	domainLabel: "Integration",
	difficulty: "Lead_CTA",
	pillars: ["Reliability", "Trust"],
	version: 1,
	status: "published",
	brief: {
		title: "Platform Event Brief",
		synopsis: "Synopsis",
	},
	stations: [
		{
			id: "st1",
			domain: "Integration_Apis",
			boardDomain: "Integration",
			prompt: "Station 1",
			probeBudget: 2,
			probes: [],
			options: [
				{
					id: "o1",
					label: "Architecture A",
					isCorrect: true,
					rationale: "Pub-sub pattern",
				},
				{
					id: "o2",
					label: "Architecture B",
					isCorrect: false,
					rationale: "Lacks idempotency",
				},
			],
		},
		{
			id: "st2",
			domain: "Integration_Apis",
			boardDomain: "Integration",
			prompt: "Station 2",
			probeBudget: 2,
			probes: [],
			options: [
				{
					id: "o3",
					label: "Architecture C",
					isCorrect: true,
					rationale: "Fine",
				},
			],
		},
	],
};

const mockIncident: TroubleshootingDrillDefinition = {
	id: "TR-001",
	title: "Missing Identity Resolution",
	format: "Troubleshooting",
	domain: "Data_Architecture",
	domainLabel: "Data 360",
	difficulty: "Lead_CTA",
	pillars: ["Trust"],
	version: 1,
	status: "published",
	architecture: {
		synopsis: "Topology synopsis",
		diagramUrl: "/diagrams/test.svg",
	},
	issue: "Profile unification failure",
	probeBudget: 3,
	probes: [],
	goldCause: {
		text: "Root cause",
		rationale: "Rationale",
	},
	hiddenDistractors: [
		{ id: "d1", text: "Wrong 1", antipattern: "AP 1", rationale: "R1" },
		{ id: "d2", text: "Wrong 2", antipattern: "AP 2", rationale: "R2" },
		{ id: "d3", text: "Wrong 3", antipattern: "AP 3", rationale: "R3" },
	],
	fix: {
		prompt: "Fix prompt",
		options: [
			{ id: "f1", label: "Fix 1", rationale: "r1", isCorrect: true },
			{ id: "f2", label: "Fix 2", rationale: "r2", isCorrect: false },
			{ id: "f3", label: "Fix 3", rationale: "r3", isCorrect: false },
		],
	},
};

const allMockDrills: DrillDefinitionDTO[] = [
	mockCaseFile1,
	mockCaseFile2,
	mockIncident,
];

describe("getDrillQuestionCount", () => {
	it("correctly counts stations or questions for drills", () => {
		expect(getDrillQuestionCount(mockCaseFile1)).toBe(3);
		expect(getDrillQuestionCount(mockCaseFile2)).toBe(2);
		expect(getDrillQuestionCount(mockIncident)).toBe(2);
	});
});

describe("calculateProficiencyReport", () => {
	it("returns empty progress when no drills completed", () => {
		const report = calculateProficiencyReport({}, allMockDrills, "domains", 4);
		expect(report.totalQuestionsAnswered).toBe(0);
		expect(report.measuredCount).toBe(0);
		expect(report.totalCount).toBe(7);
		expect(report.collectingData.length).toBe(7);
		expect(report.whereToStart.length).toBe(0);
		expect(report.strengths.length).toBe(0);
	});

	it("aggregates domain stats and enforces 4-question threshold", () => {
		// CF-001 has 3 questions. Completed with 67% accuracy (2 of 3 right).
		const attempts: Record<string, DrillAttemptRecord> = {
			"CF-001": {
				drillId: "CF-001",
				format: "Case_File",
				completedAt: "2026-09-27T00:00:00Z",
				score: 150,
				accuracy: 2 / 3,
				attemptsCount: 1,
			},
		};

		const report = calculateProficiencyReport(
			attempts,
			allMockDrills,
			"domains",
			4,
		);
		expect(report.totalQuestionsAnswered).toBe(3);
		// Data_Architecture has 3 questions, threshold is 4 -> still collecting data
		const dataArch = report.items.find((i) => i.id === "Data_Architecture");
		expect(dataArch).toBeDefined();
		if (!dataArch) return;
		expect(dataArch.totalQuestions).toBe(3);
		expect(dataArch.correctQuestions).toBe(2);
		expect(dataArch.accuracy).toBe(67);
		expect(dataArch.isMeasured).toBe(false);
		expect(report.collectingData).toContainEqual(dataArch);
	});

	it("triages measured domains into strengths (>=80%) and whereToStart (<80%)", () => {
		// Simulate multiple attempts or enriched telemetry surpassing 4 questions
		const attempts: Record<string, DrillAttemptRecord> = {
			"CF-001": {
				drillId: "CF-001",
				format: "Case_File",
				completedAt: "2026-09-27T00:00:00Z",
				score: 150,
				accuracy: 1, // 3/3 right
				attemptsCount: 1,
				steps: [
					{ stepId: "s1", confidence: 0.85, isCorrect: true, score: 90 },
					{ stepId: "s2", confidence: 0.95, isCorrect: true, score: 98 },
					{ stepId: "s3", confidence: 0.7, isCorrect: true, score: 85 },
					{ stepId: "s4", confidence: 0.85, isCorrect: true, score: 90 },
				],
			},
			"CF-002": {
				drillId: "CF-002",
				format: "Case_File",
				completedAt: "2026-09-27T00:00:00Z",
				score: 50,
				accuracy: 0.5,
				attemptsCount: 1,
				steps: [
					{ stepId: "st1", confidence: 0.7, isCorrect: true, score: 70 },
					{ stepId: "st2", confidence: 0.85, isCorrect: false, score: -20 },
					{ stepId: "st3", confidence: 0.7, isCorrect: false, score: -10 },
					{ stepId: "st4", confidence: 0.7, isCorrect: false, score: -10 },
				],
			},
		};

		const report = calculateProficiencyReport(
			attempts,
			allMockDrills,
			"domains",
			4,
		);
		expect(report.totalQuestionsAnswered).toBe(8);
		expect(report.measuredCount).toBe(2);

		// Data_Architecture: 4/4 = 100% -> Strengths
		expect(report.strengths.some((s) => s.id === "Data_Architecture")).toBe(
			true,
		);

		// Integration_Apis: 1/4 = 25% -> Where to start
		expect(report.whereToStart.some((w) => w.id === "Integration_Apis")).toBe(
			true,
		);
	});

	it("aggregates across the 7 Architectural Domains when threshold is passed directly", () => {
		const attempts: Record<string, DrillAttemptRecord> = {
			"CF-001": {
				drillId: "CF-001",
				format: "Case_File",
				completedAt: "2026-09-27T00:00:00Z",
				score: 150,
				accuracy: 1, // 3/3 right
				attemptsCount: 1,
			},
			"CF-002": {
				drillId: "CF-002",
				format: "Case_File",
				completedAt: "2026-09-27T00:00:00Z",
				score: 50,
				accuracy: 0.5, // 1/2 right
				attemptsCount: 1,
			},
		};

		const report = calculateProficiencyReport(attempts, allMockDrills, 2);
		expect(report.totalCount).toBe(7);
		expect(report.dimension).toBe("domains");

		// Data_Architecture has 3 questions, threshold is 2 -> measured
		const dataArch = report.items.find((p) => p.id === "Data_Architecture");
		expect(dataArch).toBeDefined();
		if (!dataArch) return;
		expect(dataArch.totalQuestions).toBe(3);
		expect(dataArch.correctQuestions).toBe(3);
		expect(dataArch.accuracy).toBe(100);
		expect(dataArch.isMeasured).toBe(true);
		expect(report.strengths).toContainEqual(dataArch);
	});
});

describe("countProbeDrivenRevisions", () => {
	it("counts stations with non-empty First Call text and probe discovery", () => {
		const attempts: Record<string, DrillAttemptRecord> = {
			"AGD-00901": {
				drillId: "AGD-00901",
				format: "Case_File",
				completedAt: "2026-10-10T00:00:00Z",
				score: 100,
				accuracy: 1,
				attemptsCount: 2,
				steps: [
					{
						stepId: "st1",
						confidence: 0.85,
						isCorrect: true,
						score: 133,
						selectedOptionId: "o1",
						selectedProbeIds: ["p1", "p2"],
						firstCall: {
							hypothesis: "Sync callouts",
							confidence: 0.7,
							skipped: false,
						},
						flippingProbeId: "p2",
					},
					{
						stepId: "st2",
						confidence: 0.85,
						isCorrect: true,
						score: 120,
						selectedOptionId: "o1",
						firstCall: { hypothesis: "Platform events", skipped: false },
					},
					{
						stepId: "st3",
						confidence: 0.7,
						isCorrect: true,
						score: 110,
						selectedOptionId: "o1",
						firstCall: { skipped: true },
					},
				],
			},
		};

		expect(countProbeDrivenRevisions(attempts)).toBe(1);
	});

	it("returns 0 when no First Call telemetry is present", () => {
		expect(
			countProbeDrivenRevisions({
				"TR-001": {
					drillId: "TR-001",
					format: "Troubleshooting",
					completedAt: "2026-10-10T00:00:00Z",
					score: 50,
					accuracy: 1,
					attemptsCount: 1,
					steps: [
						{ stepId: "s1", confidence: 0.85, isCorrect: true, score: 50 },
					],
				},
			}),
		).toBe(0);
	});
});
