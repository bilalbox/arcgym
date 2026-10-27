import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sanitizeDrillForClient } from "../formats/index.js";
import type {
	CaseFileDrillDefinition,
	TroubleshootingDrillDefinition,
} from "../types/drill.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_DRILL: TroubleshootingDrillDefinition = {
	id: "AGD-01001",
	title: "Fixture Incident",
	format: "Troubleshooting",
	domain: "Data_Architecture",
	domainLabel: "Data Architecture",
	difficulty: "Lead_CTA",
	pillars: ["Reliability"],
	version: 1,
	status: "published",
	architecture: {
		synopsis: "CRM feeds Data Cloud.",
		diagramUrl: "/diagrams/fixture.svg",
	},
	issue: "Segment refreshes intermittently time out.",
	probeBudget: 3,
	probes: [
		{
			id: "p1",
			label: "What changed?",
			tier: "pivotal",
			answer: "Formula fields added",
		},
	],
	goldCause: {
		text: "Secret gold root cause text",
		rationale: "Secret gold rationale",
		citationUrl: "https://architect.salesforce.com/secret",
	},
	hiddenDistractors: [
		{
			id: "d1",
			text: "Secret distractor 1",
			antipattern: "Antipattern 1",
			rationale: "Distractor rationale 1",
		},
	],
	fix: {
		prompt: "Secret fix prompt",
		options: [
			{
				id: "fix_1",
				label: "Secret gold fix",
				rationale: "Secret fix rationale",
				isCorrect: true,
			},
		],
	},
};

const FIXTURE_CASE_FILE: CaseFileDrillDefinition = {
	id: "AGD-00403",
	title: "Fixture Case File",
	format: "Case_File",
	domain: "Platform_Core",
	domainLabel: "Platform Core",
	difficulty: "Associate_Domain_Architect",
	pillars: ["Trust"],
	version: 1,
	status: "published",
	brief: {
		title: "Brief title",
		synopsis: "Synopsis text",
	},
	stations: [],
};

describe("sanitizeDrillForClient", () => {
	it("omits goldCause, hiddenDistractors, and fix from Troubleshooting drills", () => {
		const sanitized = sanitizeDrillForClient(FIXTURE_DRILL);
		expect(sanitized.id).toBe("AGD-01001");
		expect(sanitized.format).toBe("Troubleshooting");
		expect("goldCause" in sanitized).toBe(false);
		expect("hiddenDistractors" in sanitized).toBe(false);
		expect("fix" in sanitized).toBe(false);
		// Other fields preserved
		expect((sanitized as typeof FIXTURE_DRILL).issue).toBe(FIXTURE_DRILL.issue);
		expect((sanitized as typeof FIXTURE_DRILL).probes).toEqual(
			FIXTURE_DRILL.probes,
		);
		expect((sanitized as typeof FIXTURE_DRILL).architecture).toEqual(
			FIXTURE_DRILL.architecture,
		);
	});

	it("passes Case_File drills through unchanged", () => {
		const sanitized = sanitizeDrillForClient(FIXTURE_CASE_FILE);
		expect(sanitized).toBe(FIXTURE_CASE_FILE);
	});
});

describe("canonicalDrills.json sanitization", () => {
	it("ensures published canonicalDrills.json contains no goldCause, hiddenDistractors, or fix in Troubleshooting drills", () => {
		const canonicalPath = path.resolve(
			__dirname,
			"../../../../apps/arcgym-web/src/data/canonicalDrills.json",
		);
		if (!fs.existsSync(canonicalPath)) {
			// If bundle not yet generated in CI before build-drills, skip or fail
			return;
		}
		const raw = fs.readFileSync(canonicalPath, "utf-8");
		const drills = JSON.parse(raw) as Array<Record<string, unknown>>;
		const incidents = drills.filter((d) => d.format === "Troubleshooting");

		for (const incident of incidents) {
			expect(
				incident.goldCause,
				`Troubleshooting drill ${incident.id} leaked goldCause into canonicalDrills.json`,
			).toBeUndefined();
			expect(
				incident.hiddenDistractors,
				`Troubleshooting drill ${incident.id} leaked hiddenDistractors into canonicalDrills.json`,
			).toBeUndefined();
			expect(
				incident.fix,
				`Troubleshooting drill ${incident.id} leaked fix into canonicalDrills.json`,
			).toBeUndefined();
		}
	});
});
