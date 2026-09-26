import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./app.html";
class App extends LightningElement {
  constructor(...args) {
    super(...args);
    this.streakDays = 1;
    this.isAuthenticated = false;
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
  handleAuthClick() {
    // Toggle or initiate Trailblazer OAuth flow
    this.isAuthenticated = !this.isAuthenticated;
  }
  /*LWC compiler v8.28.2*/
}
_registerDecorators(App, {
  fields: ["streakDays", "isAuthenticated", "todayDrill"]
});
const __lwc_component_class_internal = _registerComponent(App, {
  tmpl: _tmpl,
  sel: "arcgym-app",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;