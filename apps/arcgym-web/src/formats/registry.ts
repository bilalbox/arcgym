import {
	DRILL_FORMAT_LABELS,
	type DrillDefinitionDTO,
	type DrillFormat,
} from "@arcgym/drill-core";
import type React from "react";
import { CaseFileRunner } from "@/components/drill/CaseFileRunner";
import { TroubleshootRunner } from "@/components/drill/TroubleshootRunner";
import { CaseFileEditor } from "@/components/studio/CaseFileEditor";
import { TroubleshootingEditor } from "@/components/studio/TroubleshootingEditor";
import type { WebDrillFormatDescriptor } from "./types";

type GenericRunner = React.ComponentType<{
	drill: DrillDefinitionDTO;
	[key: string]: unknown;
}>;
type GenericEditor = React.ComponentType<{
	drill: DrillDefinitionDTO;
	onChange: (next: DrillDefinitionDTO) => void;
}>;

export const caseFileWebDescriptor: WebDrillFormatDescriptor = {
	format: "Case_File",
	label: DRILL_FORMAT_LABELS.Case_File,
	Runner: CaseFileRunner as unknown as GenericRunner,
	Editor: CaseFileEditor as unknown as GenericEditor,
	catalogPath: "/cases",
	detailRoutePrefix: "/cases",
};

export const troubleshootingWebDescriptor: WebDrillFormatDescriptor = {
	format: "Troubleshooting",
	label: DRILL_FORMAT_LABELS.Troubleshooting,
	Runner: TroubleshootRunner as unknown as GenericRunner,
	Editor: TroubleshootingEditor as unknown as GenericEditor,
	catalogPath: "/troubleshoot",
	detailRoutePrefix: "/troubleshoot",
};

export const WEB_DRILL_FORMAT_DESCRIPTORS: Record<
	DrillFormat,
	WebDrillFormatDescriptor
> = {
	Case_File: caseFileWebDescriptor,
	Troubleshooting: troubleshootingWebDescriptor,
};

export function getWebFormatDescriptor(
	format: DrillFormat,
): WebDrillFormatDescriptor {
	const descriptor = WEB_DRILL_FORMAT_DESCRIPTORS[format];
	if (!descriptor) {
		throw new Error(`Unknown web format descriptor for format: ${format}`);
	}
	return descriptor;
}

export function getAllWebFormatDescriptors(): WebDrillFormatDescriptor[] {
	return Object.values(WEB_DRILL_FORMAT_DESCRIPTORS);
}
