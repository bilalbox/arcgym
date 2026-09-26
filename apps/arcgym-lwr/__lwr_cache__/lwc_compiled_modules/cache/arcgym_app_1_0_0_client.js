import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./app.html";
import { ArcGymScoringEngine } from '@arcgym/drill-core';
class App extends LightningElement {
  constructor(...args) {
    super(...args);
    this.streakDays = 1;
    this.isAuthenticated = false;
    this.selectedConfidence = null;
    this.selectedOption = 'A';
    this.todayDrill = {
      id: 'AGD-00101',
      title: 'Core Platform & Integration: Scale vs. Coupling in Order Processing',
      format: 'Rapid Fire',
      domain: 'Enterprise Integration & Scalability',
      prompt: 'AI generates functional Apex in seconds. You are responsible for blast radius, governor limit resilience, and transaction boundary integrity.',
      pillars: ['Reliability', 'Operational_Excellence', 'Cost_Optimization']
    };
  }
  get authButtonLabel() {
    return this.isAuthenticated ? 'Connected to Trailblazer' : 'Connect Trailblazer';
  }
  get isSubmitDisabled() {
    return this.selectedConfidence === null;
  }
  handleAuthClick() {
    this.isAuthenticated = !this.isAuthenticated;
  }
  handleConfidenceSelected(event) {
    this.selectedConfidence = event.detail.confidence;
  }
  handleSubmitDecision() {
    if (!this.selectedConfidence) return;

    // Calculate score using ArcGymScoringEngine
    const isCorrect = this.selectedOption === 'A';
    const scoreResult = ArcGymScoringEngine.calculateDecisionScore(this.selectedConfidence, isCorrect);
    console.log('ArcGym Decision Committed:', {
      option: this.selectedOption,
      confidence: this.selectedConfidence,
      scoreResult
    });

    // Trigger streak increment / completion alert
    alert(`Decision Committed!\n\nPoints Awarded: ${scoreResult.pointsAwarded}\nQuadrant: ${scoreResult.quadrant}\nStreak: ${this.streakDays + 1} Days 🔥`);
    this.streakDays += 1;
  }
  /*LWC compiler v8.28.2*/
}
_registerDecorators(App, {
  fields: ["streakDays", "isAuthenticated", "selectedConfidence", "selectedOption", "todayDrill"]
});
const __lwc_component_class_internal = _registerComponent(App, {
  tmpl: _tmpl,
  sel: "arcgym-app",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;