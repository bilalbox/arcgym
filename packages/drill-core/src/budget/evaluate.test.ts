import { describe, it, expect } from 'vitest';
import { isArchitectBudgetOptimal } from './evaluate.js';

describe('isArchitectBudgetOptimal', () => {
  const rules = [
    { categoryId: 'soql', op: 'lte' as const, value: 25 },
    { categoryId: 'cpu', op: 'gte' as const, value: 30 },
    { categoryId: 'heap', op: 'lte' as const, value: 25 },
    { categoryId: 'callout', op: 'lte' as const, value: 20 },
  ];

  it('returns true when every rule holds', () => {
    expect(
      isArchitectBudgetOptimal(
        { soql: 25, cpu: 30, heap: 25, callout: 20 },
        rules
      )
    ).toBe(true);
  });

  it('returns false when any rule fails', () => {
    expect(
      isArchitectBudgetOptimal(
        { soql: 30, cpu: 30, heap: 25, callout: 15 },
        rules
      )
    ).toBe(false);
  });
});
