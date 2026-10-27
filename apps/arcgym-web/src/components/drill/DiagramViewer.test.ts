import { describe, expect, it } from "vitest";
import { sanitizeDiagramSource } from "./DiagramViewer";

describe("sanitizeDiagramSource", () => {
	it("strips legacy classDef declarations while preserving node class assignments", () => {
		const raw = `flowchart LR
  classDef store fill:#f8fafc,stroke:#64748b;
  classDef cache fill:#f0fdfa,stroke:#0d9488,stroke-width:1.8px;
  classDef clients fill:#ffffff,stroke:#cbd5e1;

  snowflake["\`**Snowflake Lakehouse**\`"]:::store
  cache["\`**Data Cloud Zero Copy**\`"]:::cache
  clients["\`**High-QPS Traffic**\`"]:::clients

  snowflake --> cache
  cache --> clients`;

		const cleaned = sanitizeDiagramSource(raw);
		expect(cleaned).not.toContain("classDef");
		expect(cleaned).not.toContain("fill:#f8fafc");
		expect(cleaned).toContain('snowflake["`**Snowflake Lakehouse**`"]:::store');
		expect(cleaned).toContain('cache["`**Data Cloud Zero Copy**`"]:::cache');
		expect(cleaned).toContain('clients["`**High-QPS Traffic**`"]:::clients');
	});

	it("strips inline style directives that break theme switching", () => {
		const raw = `flowchart TD
  style A fill:#fff,stroke:#333
  style B fill:#000
  A --> B`;

		const cleaned = sanitizeDiagramSource(raw);
		expect(cleaned).not.toContain("style A");
		expect(cleaned).not.toContain("style B");
		expect(cleaned).toContain("A --> B");
	});

	it("leaves clean Mermaid diagrams untouched", () => {
		const raw = `flowchart LR
  A:::store --> B:::cache`;

		expect(sanitizeDiagramSource(raw)).toBe(raw);
	});
});
