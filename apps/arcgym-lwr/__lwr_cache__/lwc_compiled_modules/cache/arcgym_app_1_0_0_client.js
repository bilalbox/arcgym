import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./app.html";
class App extends LightningElement {
  constructor(...args) {
    super(...args);
    this.streakDays = 1;
    this.activeFormat = 'Rapid_Fire';
    this.isAuthenticated = false;
    this.drillsByFormat = {
      Rapid_Fire: {
        id: 'AGD-00101',
        title: 'Core Platform & Agentic Architecture Trade-Offs',
        format: 'Rapid Fire',
        domain: 'Core Platform & Agentforce',
        prompt: 'High-velocity decision reps: CDC vs. Platform Events, Skinny Tables, Flow vs. Apex bulkification, and Zero Copy.',
        pillars: ['Reliability', 'Trust', 'Operational_Excellence']
      },
      Currency: {
        id: 'AGD-00102',
        title: 'High-Throughput Order Ingestion & Fraud Risk Pipeline',
        format: 'Currency',
        domain: 'Core Platform & Governor Capacity',
        prompt: 'Resource envelope discipline: Allocate a 100-point Governor budget across caching, concurrency locking, ML risk scoring, and event egress.',
        pillars: ['Reliability', 'Cost_Optimization', 'Operational_Excellence']
      },
      Scenario: {
        id: 'AGD-00103',
        title: 'The Dreamforce Agentforce Crunch: Velocity vs. Platform Trust',
        domain: 'Agentic Enterprise & Data Governance',
        prompt: 'Navigate C-suite political pressure and trade-offs. Balance Stakeholder Trust with Well-Architected Integrity across 3 critical moves.',
        pillars: ['Trust', 'Reliability', 'Fairness']
      },
      Lesson: {
        id: 'AGD-00104',
        title: 'Legacy Flow Monolith Refactor & Verification',
        format: 'Lesson',
        domain: 'Automation Governance',
        prompt: 'Forensic diagnosis of CPU timeouts across a 14-element record-triggered Flow. Refactor into bulkified Apex and Event Monitoring.',
        pillars: ['Operational_Excellence', 'Reliability']
      }
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
  get todayDrill() {
    return this.drillsByFormat[this.activeFormat] || this.drillsByFormat.Rapid_Fire;
  }
  get isRapidFire() {
    return this.activeFormat === 'Rapid_Fire';
  }
  get isCurrency() {
    return this.activeFormat === 'Currency';
  }
  get isScenario() {
    return this.activeFormat === 'Scenario';
  }
  get isLesson() {
    return this.activeFormat === 'Lesson';
  }
  get rapidFirePillClass() {
    return `format-pill ${this.isRapidFire ? 'format-pill-active' : ''}`;
  }
  get currencyPillClass() {
    return `format-pill ${this.isCurrency ? 'format-pill-active' : ''}`;
  }
  get scenarioPillClass() {
    return `format-pill ${this.isScenario ? 'format-pill-active' : ''}`;
  }
  get lessonPillClass() {
    return `format-pill ${this.isLesson ? 'format-pill-active' : ''}`;
  }
  get authButtonLabel() {
    return this.isAuthenticated ? 'Connected to Trailblazer' : 'Connect Trailblazer';
  }
  handleSelectFormat(event) {
    const format = event.currentTarget.dataset.format;
    if (format) {
      this.activeFormat = format;
    }
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
    streakDays: 1,
    activeFormat: 1
  },
  fields: ["isAuthenticated", "drillsByFormat"]
});
const __lwc_component_class_internal = _registerComponent(App, {
  tmpl: _tmpl,
  sel: "arcgym-app",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;