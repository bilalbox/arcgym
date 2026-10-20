import { DRILL_FORMATS } from '@arcgym/drill-core';
import { describe, expect, it } from 'vitest';
import {
  getAllWebFormatDescriptors,
  getWebFormatDescriptor,
  WEB_DRILL_FORMAT_DESCRIPTORS,
} from './registry';

describe('Web Drill Format Registry', () => {
  it('has a web descriptor registered for every DrillFormat in DRILL_FORMATS', () => {
    for (const format of DRILL_FORMATS) {
      const desc = WEB_DRILL_FORMAT_DESCRIPTORS[format];
      expect(desc).toBeDefined();
      expect(desc.format).toBe(format);
      expect(desc.label).toBeDefined();
      expect(desc.Runner).toBeDefined();
      expect(desc.Editor).toBeDefined();
      expect(desc.detailRoutePrefix).toBeDefined();
      expect(desc.detailRoutePrefix.startsWith('/')).toBe(true);
    }
  });

  it('getWebFormatDescriptor retrieves the matching descriptor', () => {
    for (const format of DRILL_FORMATS) {
      const desc = getWebFormatDescriptor(format);
      expect(desc).toBe(WEB_DRILL_FORMAT_DESCRIPTORS[format]);
    }
  });

  it('getAllWebFormatDescriptors returns all web descriptors', () => {
    const all = getAllWebFormatDescriptors();
    expect(all).toHaveLength(DRILL_FORMATS.length);
    const formats = all.map((d) => d.format);
    expect(formats).toEqual(expect.arrayContaining(DRILL_FORMATS));
  });

  it('provides correct route metadata and catalog paths', () => {
    expect(WEB_DRILL_FORMAT_DESCRIPTORS.Case_File.detailRoutePrefix).toBe('/cases');
    expect(WEB_DRILL_FORMAT_DESCRIPTORS.Case_File.catalogPath).toBe('/cases');

    expect(WEB_DRILL_FORMAT_DESCRIPTORS.Troubleshooting.detailRoutePrefix).toBe('/troubleshoot');
    expect(WEB_DRILL_FORMAT_DESCRIPTORS.Troubleshooting.catalogPath).toBe('/troubleshoot');
  });
});
