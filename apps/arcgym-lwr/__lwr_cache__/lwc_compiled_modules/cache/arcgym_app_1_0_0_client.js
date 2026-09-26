import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./app.html";
class App extends LightningElement {
  constructor(...args) {
    super(...args);
    this.streakDays = 1;
    this.isAuthenticated = false;
    this.todayDrill = {
      id: 'AGD-00101',
      title: 'Core Platform & Agentic Architecture Trade-Offs',
      format: 'Rapid Fire',
      domain: 'Core Platform & Agentforce',
      prompt: 'AI generates functional Apex in seconds. You are responsible for blast radius, governor limit resilience, and transaction boundary integrity.',
      pillars: ['Reliability', 'Trust', 'Operational_Excellence']
    };
  }
  connectedCallback() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('arcgym_streak');
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.streakDays) {
            this.streakDays = data.streakDays;
          }
        }
      }
    } catch (e) {
      // Fallback
    }
  }
  get authButtonLabel() {
    return this.isAuthenticated ? 'Connected to Trailblazer' : 'Connect Trailblazer';
  }
  handleAuthClick() {
    this.isAuthenticated = !this.isAuthenticated;
  }
  handleDrillComplete(event) {
    if (event.detail && event.detail.streakDays) {
      this.streakDays = event.detail.streakDays;
    }
  }
  /*LWC compiler v8.28.2*/
}
_registerDecorators(App, {
  track: {
    streakDays: 1
  },
  fields: ["isAuthenticated", "todayDrill"]
});
const __lwc_component_class_internal = _registerComponent(App, {
  tmpl: _tmpl,
  sel: "arcgym-app",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;