import type { DrillDefinitionDTO, DrillFormat } from "@arcgym/drill-core";
import type React from "react";

export interface WebDrillFormatDescriptor {
	format: DrillFormat;
	label: string;
	Runner: React.ComponentType<{
		drill: DrillDefinitionDTO;
		[key: string]: unknown;
	}>;
	Editor: React.ComponentType<{
		drill: DrillDefinitionDTO;
		onChange: (next: DrillDefinitionDTO) => void;
	}>;
	catalogPath?: string;
	detailRoutePrefix: string;
}
