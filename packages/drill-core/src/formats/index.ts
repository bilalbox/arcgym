import type {
	CaseFileDrillDefinition,
	ClientDrillDefinitionDTO,
	ClientTroubleshootingDrillDefinition,
	DrillDefinitionDTO,
	DrillFormat,
	TroubleshootingDrillDefinition,
} from "../types/drill.js";
import { caseFileDescriptor } from "./caseFile.js";
import { troubleshootingDescriptor } from "./troubleshooting.js";
import type { DrillFormatDescriptor } from "./types.js";

export { caseFileDescriptor } from "./caseFile.js";
export { troubleshootingDescriptor } from "./troubleshooting.js";
export * from "./types.js";

export const DRILL_FORMAT_LABELS: Record<DrillFormat, string> = {
	Case_File: "Case File",
	Troubleshooting: "Troubleshooting",
};

export const DRILL_FORMAT_DESCRIPTORS: Record<
	DrillFormat,
	DrillFormatDescriptor
> = {
	Case_File: caseFileDescriptor,
	Troubleshooting: troubleshootingDescriptor,
};

export type FormatToAuthoredDrill<F extends DrillFormat> = F extends "Case_File"
	? CaseFileDrillDefinition
	: F extends "Troubleshooting"
		? TroubleshootingDrillDefinition
		: never;

export type FormatToClientDrill<F extends DrillFormat> = F extends "Case_File"
	? CaseFileDrillDefinition
	: F extends "Troubleshooting"
		? ClientTroubleshootingDrillDefinition
		: never;

export function getDrillFormatDescriptor<F extends DrillFormat>(
	format: F,
): DrillFormatDescriptor<FormatToAuthoredDrill<F>, FormatToClientDrill<F>>;
export function getDrillFormatDescriptor(
	format: DrillFormat,
): DrillFormatDescriptor;
export function getDrillFormatDescriptor(
	format: DrillFormat,
): DrillFormatDescriptor {
	const descriptor = DRILL_FORMAT_DESCRIPTORS[format];
	if (!descriptor) {
		throw new Error(`Unknown drill format: ${format}`);
	}
	return descriptor;
}

export function getAllDrillFormatDescriptors(): DrillFormatDescriptor[] {
	return Object.values(DRILL_FORMAT_DESCRIPTORS);
}

export function sanitizeDrillForClient(
	drill: DrillDefinitionDTO,
): ClientDrillDefinitionDTO {
	return getDrillFormatDescriptor(drill.format).sanitizeForClient(drill);
}
