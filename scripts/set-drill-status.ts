/**
 * Toggle drill editorial status (draft | published).
 *
 * Usage:
 *   npx tsx scripts/set-drill-status.ts --status draft
 *   npx tsx scripts/set-drill-status.ts --status published AGD-00201 AGD-00202
 *   npx tsx scripts/set-drill-status.ts --status draft --domain Data_Architecture
 *   npx tsx scripts/set-drill-status.ts --status published --domain-label "Data 360"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { lintDrillWording } from "../packages/drill-core/src/index.js";

const ROOT_DIR = process.cwd();
const DRILLS_DIR = path.join(ROOT_DIR, "content/drills");
const STATUSES = new Set(["draft", "published"]);

function usage(): never {
	console.error(`Usage:
  npx tsx scripts/set-drill-status.ts --status <draft|published> [AGD-xxxxx ...]
  npx tsx scripts/set-drill-status.ts --status <draft|published> --all
  npx tsx scripts/set-drill-status.ts --status <draft|published> --domain <ArchitecturalDomain>
  npx tsx scripts/set-drill-status.ts --status <draft|published> --domain-label <substring>
`);
	process.exit(1);
}

function parseArgs(argv: string[]) {
	let status: string | undefined;
	let all = false;
	let domain: string | undefined;
	let domainLabel: string | undefined;
	const ids: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		if (arg === "--status") {
			status = argv[++i];
		} else if (arg === "--all") {
			all = true;
		} else if (arg === "--domain") {
			domain = argv[++i];
		} else if (arg === "--domain-label") {
			domainLabel = argv[++i];
		} else if (arg === "--help" || arg === "-h") {
			usage();
		} else if (arg.startsWith("-")) {
			console.error(`Unknown flag: ${arg}`);
			usage();
		} else {
			ids.push(arg);
		}
	}

	if (!status || !STATUSES.has(status)) {
		console.error("Required: --status draft|published");
		usage();
	}

	if (!all && ids.length === 0 && !domain && !domainLabel) {
		console.error("Specify --all, drill IDs, --domain, and/or --domain-label");
		usage();
	}

	return {
		status: status as "draft" | "published",
		all,
		domain,
		domainLabel,
		ids,
	};
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	const files = fs.readdirSync(DRILLS_DIR).filter((f) => f.endsWith(".json"));
	const idSet = new Set(args.ids.map((id) => id.toUpperCase()));
	let updated = 0;
	let matched = 0;
	let blocked = 0;

	for (const file of files) {
		const filePath = path.join(DRILLS_DIR, file);
		const drill = JSON.parse(fs.readFileSync(filePath, "utf-8"));

		const matchesAll = args.all;
		const matchesId =
			idSet.size > 0 && idSet.has(String(drill.id).toUpperCase());
		const matchesDomain = args.domain ? drill.domain === args.domain : false;
		const matchesLabel = args.domainLabel
			? String(drill.domainLabel ?? "")
					.toLowerCase()
					.includes(args.domainLabel.toLowerCase())
			: false;

		if (!(matchesAll || matchesId || matchesDomain || matchesLabel)) {
			continue;
		}

		matched++;
		if (drill.status === args.status) {
			console.log(`  skip ${drill.id} (already ${args.status})`);
			continue;
		}

		if (args.status === "published") {
			const findings = lintDrillWording(drill);
			if (findings.length > 0) {
				console.error(
					`  block ${drill.id}: ${findings.length} wording finding(s)`,
				);
				for (const f of findings)
					console.error(`    [WORDING] ${f.ruleId} @ ${f.where}: ${f.message}`);
				blocked++;
				continue;
			}
		}

		drill.status = args.status;
		fs.writeFileSync(filePath, `${JSON.stringify(drill, null, 2)}\n`, "utf-8");
		console.log(`  ${drill.id}: → ${args.status}`);
		updated++;
	}

	if (matched === 0) {
		console.error("No drills matched the selection criteria.");
		process.exit(1);
	}

	console.log(
		`\nUpdated ${updated} of ${matched} matched drills to status=${args.status}.`,
	);
	console.log("Run `pnpm build:drills` to refresh the learner catalog.\n");

	if (blocked > 0) {
		console.error(
			`${blocked} drill(s) not published: fix their wording findings first.`,
		);
		process.exit(1);
	}
}

main();
