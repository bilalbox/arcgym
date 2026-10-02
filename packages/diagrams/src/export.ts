import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Render an authored SVG React tree to a standalone SVG document string.
 * Ensures xmlns is present for static <img> consumption.
 */
export function exportSvg(element: ReactElement): string {
  const markup = renderToStaticMarkup(element);
  if (!markup.startsWith('<svg')) {
    throw new Error('exportSvg expects a root <svg> element');
  }
  if (markup.includes('xmlns=')) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup.replace(
    '<svg',
    '<svg xmlns="http://www.w3.org/2000/svg"',
  )}\n`;
}
