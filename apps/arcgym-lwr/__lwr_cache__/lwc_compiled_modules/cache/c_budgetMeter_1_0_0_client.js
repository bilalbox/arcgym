import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./budgetMeter.html";
class BudgetMeter extends LightningElement {
  constructor(...args) {
    super(...args);
    this.totalBudget = 100;
    this.usedBudget = 0;
    this.unitLabel = 'Governor Points';
    this.title = 'Resource Budget';
  }
  get remainingBudget() {
    return Math.max(0, this.totalBudget - this.usedBudget);
  }
  get exceededAmount() {
    return Math.max(0, this.usedBudget - this.totalBudget);
  }
  get isOverBudget() {
    return this.usedBudget > this.totalBudget;
  }
  get percentUsed() {
    if (!this.totalBudget || this.totalBudget <= 0) return 0;
    return Math.round(this.usedBudget / this.totalBudget * 100);
  }
  get isNearBudget() {
    return this.percentUsed >= 80 && !this.isOverBudget;
  }
  get meterFillStyle() {
    const visualWidth = Math.min(100, this.percentUsed);
    return `width: ${visualWidth}%;`;
  }
  get meterStatusClass() {
    if (this.isOverBudget) {
      return 'meter-fill meter-fill_exceeded';
    }
    if (this.isNearBudget) {
      return 'meter-fill meter-fill_warning';
    }
    return 'meter-fill meter-fill_normal';
  }
  get statusBadgeText() {
    if (this.isOverBudget) return 'LIMIT EXCEEDED';
    if (this.isNearBudget) return 'NEAR LIMIT';
    return 'HEALTHY';
  }
  get statusBadgeClass() {
    if (this.isOverBudget) return 'slds-badge slds-theme_error';
    if (this.isNearBudget) return 'slds-badge slds-theme_warning';
    return 'slds-badge slds-theme_success';
  }
  /*LWC compiler v8.28.2*/
}
_registerDecorators(BudgetMeter, {
  publicProps: {
    totalBudget: {
      config: 0
    },
    usedBudget: {
      config: 0
    },
    unitLabel: {
      config: 0
    },
    title: {
      config: 0
    }
  }
});
const __lwc_component_class_internal = _registerComponent(BudgetMeter, {
  tmpl: _tmpl,
  sel: "c-budget-meter",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;