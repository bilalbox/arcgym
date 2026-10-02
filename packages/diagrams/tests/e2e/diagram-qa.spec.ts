import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import {
  auditSvgGeometry,
  DEFAULT_DIAGRAM_QA_OPTIONS,
  type DiagramQaViolation,
  EMITTED_DIAGRAMS,
} from '../../src/index.ts';

type ArtifactReport = {
  artifactKey: string;
  title: string;
  violations: DiagramQaViolation[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '../..');
const diagramsDir = path.join(repoRoot, 'apps/arcgym-web/public/diagrams');

function formatViolations(reports: ArtifactReport[]): string {
  const lines: string[] = [];
  for (const report of reports) {
    if (report.violations.length === 0) continue;
    lines.push(`\n${report.artifactKey} (${report.title})`);
    for (const violation of report.violations) {
      const pair = [violation.a, violation.b].filter(Boolean).join(' × ');
      const meta = violation.meta ? ` ${JSON.stringify(violation.meta)}` : '';
      lines.push(`  - [${violation.tier}/${violation.rule}] ${violation.message}: ${pair}${meta}`);
    }
  }
  return lines.join('\n');
}

test.describe('diagram L1+L2 geometry QA', () => {
  test.describe.configure({ mode: 'serial' });

  test('package-emitted SVGs satisfy L1 and L2 geometry rules', async ({ page }) => {
    expect(EMITTED_DIAGRAMS.length).toBeGreaterThan(0);

    const reports: ArtifactReport[] = [];

    for (const diagram of EMITTED_DIAGRAMS) {
      const svgPath = path.join(diagramsDir, `${diagram.id}.svg`);
      const svgMarkup = await readFile(svgPath, 'utf8');
      await page.setContent(
        `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0">${svgMarkup}</body></html>`,
        { waitUntil: 'domcontentloaded' },
      );

      const svg = page.locator('svg').first();
      await expect(svg).toBeVisible();
      await expect
        .poll(async () => svg.locator('*').count(), { timeout: 10_000 })
        .toBeGreaterThan(5);

      const violations = await svg.evaluate(auditSvgGeometry, DEFAULT_DIAGRAM_QA_OPTIONS);
      reports.push({
        artifactKey: diagram.id,
        title: diagram.title,
        violations,
      });
    }

    const failed = reports.filter((report) => report.violations.length > 0);
    const violationCount = failed.reduce((sum, report) => sum + report.violations.length, 0);
    const l1Count = failed.reduce(
      (sum, report) => sum + report.violations.filter((v) => v.tier === 'L1').length,
      0,
    );
    const l2Count = failed.reduce(
      (sum, report) => sum + report.violations.filter((v) => v.tier === 'L2').length,
      0,
    );

    const outDir = path.join(packageRoot, 'test-results', 'diagram-qa');
    await mkdir(outDir, { recursive: true });
    await writeFile(
      path.join(outDir, 'report.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          options: DEFAULT_DIAGRAM_QA_OPTIONS,
          catalogSize: EMITTED_DIAGRAMS.length,
          failedArtifactCount: failed.length,
          violationCount,
          l1ViolationCount: l1Count,
          l2ViolationCount: l2Count,
          reports,
        },
        null,
        2,
      ),
    );

    const summary = [
      `${failed.length}/${EMITTED_DIAGRAMS.length} artifacts failed`,
      `${violationCount} violations (L1=${l1Count}, L2=${l2Count})`,
      `report: ${path.join(outDir, 'report.json')}`,
      formatViolations(failed),
    ].join('\n');

    expect(failed.length, summary).toBe(0);
  });
});
