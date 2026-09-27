import { BudgetOptimalRuleDTO } from '../types/drill.js';

/** True when every Architect Budget optimal rule holds for the given allocations. */
export function isArchitectBudgetOptimal(
  allocations: Record<string, number>,
  rules: BudgetOptimalRuleDTO[]
): boolean {
  return rules.every((rule) => {
    const value = allocations[rule.categoryId] ?? 0;
    return rule.op === 'lte' ? value <= rule.value : value >= rule.value;
  });
}
