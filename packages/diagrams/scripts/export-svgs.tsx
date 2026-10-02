import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPOLOGY_RENDERERS } from '../src/authored/index.ts';
import { exportSvg } from '../src/export.ts';
import { EMITTED_DIAGRAMS } from '../src/registry.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const outDir = path.join(repoRoot, 'apps/arcgym-web/public/diagrams');

async function main() {
  await mkdir(outDir, { recursive: true });

  for (const diagram of EMITTED_DIAGRAMS) {
    const render = TOPOLOGY_RENDERERS[diagram.id];
    if (!render) {
      throw new Error(`No renderer registered for emitted diagram ${diagram.id}`);
    }
    const svg = exportSvg(render());
    const outPath = path.join(outDir, `${diagram.id}.svg`);
    await writeFile(outPath, svg, 'utf8');
    console.log(`wrote ${path.relative(repoRoot, outPath)}`);
  }

  console.log(`exported ${EMITTED_DIAGRAMS.length} diagrams`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
