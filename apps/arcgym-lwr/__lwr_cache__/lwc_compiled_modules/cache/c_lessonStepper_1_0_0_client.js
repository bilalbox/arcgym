import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./lessonStepper.html";
import { ArcGymScoringEngine } from 'c/scoringEngine';
const STREAK_KEY = 'arcgym_streak';
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}
function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function loadStreakFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STREAK_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const today = getTodayString();
        const yesterday = getYesterdayString();
        if (data.lastCompletedDate === today || data.lastCompletedDate === yesterday) {
          return data.streakDays || 1;
        }
      }
    }
  } catch (e) {
    // Fallback
  }
  return 1;
}
function saveStreakToStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const today = getTodayString();
      const yesterday = getYesterdayString();
      const raw = window.localStorage.getItem(STREAK_KEY);
      let streakDays = 1;
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lastCompletedDate === today) {
          streakDays = data.streakDays || 1;
        } else if (data.lastCompletedDate === yesterday) {
          streakDays = (data.streakDays || 1) + 1;
        } else {
          streakDays = 1;
        }
      }
      window.localStorage.setItem(STREAK_KEY, JSON.stringify({
        streakDays,
        lastCompletedDate: today
      }));
      return streakDays;
    }
  } catch (e) {
    // Fallback
  }
  return 1;
}
const DEFAULT_LESSON = {
  id: 'les-flow-monolith-01',
  title: 'Refactoring the Fragile Record-Triggered Automation Monolith',
  domain: 'Automation Governance & Operational Excellence',
  stages: [{
    id: 'stage_1',
    stageName: 'Stage 1: Forensic Diagnosis',
    focusPillar: 'Reliability',
    title: 'Diagnosis',
    prompt: 'An Opportunity "Closed Won" Record-Triggered Flow contains 14 element steps (record lookups, loop updating 250 child line items, and an external HTTP callout). Under bulk upload, it throws System.LimitException: Apex CPU time limit exceeded and System.CalloutException: You have uncommitted work pending. What is the fundamental root cause?',
    codeSnippet: `// Monolithic Flow Execution Log Snapshot
[RECORD_TRIGGERED_FLOW] Opportunity_After_Save_Monolith
--> Element: Get_Child_Line_Items (SOQL Count: 1)
--> Element: Loop_Through_Items (Iterating 250 rows)
    --> Element: Update_Line_Item_Price (DML executed inside loop!)
--> Element: Callout_To_Billing_ERP (HTTP POST https://api.erp.internal/invoice)
[FATAL_EXCEPTION] System.CalloutException: You have uncommitted work pending.
[FATAL_EXCEPTION] System.LimitException: Apex CPU time limit exceeded (10,024ms > 10,000ms)`,
    citationUrl: 'https://architect.salesforce.com/design/decision-guides/automation',
    successRationale: 'Correct! Executing synchronous DML prior to a synchronous HTTP callout in the same transaction thread throws an uncommitted work pending exception, while processing 250 rows in a Flow loop without memory bulkification exhausts CPU limits.',
    options: [{
      id: 's1_opt_a',
      label: 'CPU time limit and uncommitted work callout failure caused by executing synchronous DML queries and synchronous HTTP callouts in the same trigger transaction thread.',
      isCorrect: true,
      coachingNote: ''
    }, {
      id: 's1_opt_b',
      label: 'Insufficient custom database indexing on Opportunity Line Item lookups causing row-level read timeouts.',
      isCorrect: false,
      coachingNote: 'Custom indexing accelerates SOQL query filtering, but indexing cannot resolve transactional DML-before-callout exceptions or Flow loop CPU exhaustion.'
    }, {
      id: 's1_opt_c',
      label: 'User profile lacks "Modify All Data" permissions on the child Invoice object.',
      isCorrect: false,
      coachingNote: 'Permission errors manifest as System.SecurityException or Insufficient Privileges, never as CPU timeout or CalloutException.'
    }]
  }, {
    id: 'stage_2',
    stageName: 'Stage 2: Target Pattern Selection',
    focusPillar: 'Operational Excellence',
    title: 'Target State',
    prompt: 'According to the Salesforce Well-Architected Automation Decision Guide, what is the target architectural pattern to replace this monolithic Flow?',
    codeSnippet: `// Recommended Well-Architected Architecture Boundary
[Event Producer] Record-Triggered Flow / Apex Trigger
       | (Publishes high-volume platform event)
       v
[Event Bus] Asynchronous Decoupling Bus
       |
       v
[Event Consumer] Queueable Apex Framework (Enqueued Worker)
  ├── 1. Performs bulkified DML via Database.update(records, false)
  └── 2. Invokes Asynchronous Callout with automatic retry & DLQ`,
    citationUrl: 'https://architect.salesforce.com/design/decision-guides/automation',
    successRationale: 'Correct! An Asynchronous High-Volume Platform Event decouples the core user transaction. The downstream Queueable Apex framework processes bulk child items in bulkified memory collections and handles callouts with clean transaction boundaries.',
    options: [{
      id: 's2_opt_a',
      label: 'Split the Flow into two separate Record-Triggered Flows on Opportunity (one for DML and one for the callout).',
      isCorrect: false,
      coachingNote: 'Splitting into multiple Flows on the same object creates non-deterministic execution order, fails to bulkify 250 records in memory, and still throws callout exceptions if triggered sequentially.'
    }, {
      id: 's2_opt_b',
      label: 'Record-Triggered Flow publishes an Asynchronous High-Volume Platform Event; a Queueable Apex worker handles bulkified child updates and asynchronous callouts.',
      isCorrect: true,
      coachingNote: ''
    }, {
      id: 's2_opt_c',
      label: 'Convert the entire pipeline into a Scheduled Apex Batch job running once every 24 hours at midnight.',
      isCorrect: false,
      coachingNote: 'Batch Apex is for non-urgent deferred processing. Closed Won deals require immediate order activation and real-time customer invoice generation.'
    }]
  }, {
    id: 'stage_3',
    stageName: 'Stage 3: Governance & Migration Sequence',
    focusPillar: 'Reliability',
    title: 'Migration',
    prompt: 'To maintain continuous order closing during migration with zero production downtime, what is the safest deployment and rollback sequence?',
    codeSnippet: null,
    citationUrl: 'https://architect.salesforce.com/well-architected/principles',
    successRationale: 'Correct! Deploying inactive, performing synthetic load testing in Full Sandbox, utilizing Custom Metadata feature flags for progressive canary routing, and observing telemetry before decommissioning old flows eliminates deployment risk.',
    options: [{
      id: 's3_opt_a',
      label: 'Deploy the new Apex components directly to production on Monday morning and deactivate the legacy Flow simultaneously.',
      isCorrect: false,
      coachingNote: 'Big-bang production deployments during peak business hours without canary routing or dry-run validation introduce severe operational and financial risk.'
    }, {
      id: 's3_opt_b',
      label: 'Deploy Asynchronous Platform Event handler inactive; validate with 5,000 synthetic closed-won orders in Full Sandbox; deploy with Custom Metadata Feature Flag enabling gradual user-cohort canary routing; retire legacy Flow after 7 days zero-defect telemetry.',
      isCorrect: true,
      coachingNote: ''
    }, {
      id: 's3_opt_c',
      label: 'Clone the Opportunity object and instruct sales reps to manually re-enter closed deals into Opportunity_V2__c during the cutover.',
      isCorrect: false,
      coachingNote: 'Manual record re-entry causes data loss, sales rep friction, and violates the Well-Architected Operational Excellence pillar.'
    }]
  }, {
    id: 'stage_4',
    stageName: 'Stage 4: Post-Refactor Observability',
    focusPillar: 'Operational Excellence',
    title: 'Observability',
    prompt: 'Now that the decoupled architecture is live in production, which Salesforce observability tool and telemetry stream specifically monitors event bus queue depth and asynchronous worker limits?',
    codeSnippet: null,
    citationUrl: 'https://architect.salesforce.com/fundamentals/architecture-basics',
    successRationale: 'Correct! Real-time telemetry via Pub/Sub API Metrics / Event Monitoring Core API Event Stream combined with AsyncApexJob execution telemetry provides comprehensive visibility into asynchronous queue depth and governor limits.',
    options: [{
      id: 's4_opt_a',
      label: 'Event Monitoring (Lightning Page View Event Type) visualized via CRM Analytics.',
      isCorrect: false,
      coachingNote: 'Lightning Page View tracks client-side browser render time and page responsiveness, not asynchronous event bus throughput or Apex worker queue depth.'
    }, {
      id: 's4_opt_b',
      label: 'Standard Setup Audit Trail exported to CSV once a month.',
      isCorrect: false,
      coachingNote: 'Setup Audit Trail records administrative metadata changes (like profile edits or field creation), not runtime execution metrics.'
    }, {
      id: 's4_opt_c',
      label: 'Salesforce Pub/Sub API Metrics & Event Monitoring Core API Event Stream paired with AsyncApexJob and Queueable Execution Limits telemetry.',
      isCorrect: true,
      coachingNote: ''
    }]
  }]
};
class LessonStepper extends LightningElement {
  constructor(...args) {
    super(...args);
    this.drill = void 0;
    this.currentStageIndex = 0;
    this.selectedOptionId = null;
    this.selectedConfidence = null;
    this.isStageSuccess = false;
    this.showCoachingAlert = false;
    this.coachingMessage = '';
    this.isComplete = false;
    this.results = [];
    this.streakDays = 1;
    this.lastBrierResult = null;
  }
  connectedCallback() {
    this.streakDays = loadStreakFromStorage();
  }
  get activeLesson() {
    return this.drill || DEFAULT_LESSON;
  }
  get lessonTitle() {
    return this.activeLesson.title;
  }
  get lessonDomain() {
    return this.activeLesson.domain;
  }
  get stages() {
    return this.activeLesson.stages || [];
  }
  get currentStage() {
    return this.stages[this.currentStageIndex] || {};
  }
  get currentStageNumber() {
    return this.currentStageIndex + 1;
  }
  get totalStages() {
    return this.stages.length;
  }
  get isSubmitDisabled() {
    return !this.selectedOptionId || this.selectedConfidence === null || this.isStageSuccess;
  }
  get formattedStages() {
    return this.stages.map((stg, index) => {
      let wizardStepClass = 'wizard-step';
      if (index < this.currentStageIndex) {
        wizardStepClass += ' wizard-step_completed';
      } else if (index === this.currentStageIndex) {
        wizardStepClass += ' wizard-step_active';
      }
      return {
        ...stg,
        stepNumber: index + 1,
        wizardStepClass
      };
    });
  }
  get formattedOptions() {
    const options = this.currentStage.options || [];
    return options.map((opt, index) => {
      const letter = LessonStepper.LETTERS[index] || String.fromCharCode(65 + index);
      const isSelected = this.selectedOptionId === opt.id;
      let cardClass = 'option-card';
      if (this.isStageSuccess) {
        if (opt.isCorrect) {
          cardClass += ' option-card_correct';
        } else {
          cardClass += ' option-card_dimmed';
        }
      } else {
        if (isSelected) {
          cardClass += ' option-card_selected';
        }
      }
      return {
        ...opt,
        letter,
        isSelected,
        cardClass
      };
    });
  }
  get stagePointsLabel() {
    if (!this.lastBrierResult) return '';
    const pts = this.lastBrierResult.pointsAwarded;
    return pts >= 0 ? `+${pts} Brier pts` : `${pts} Brier pts`;
  }
  get nextStageButtonLabel() {
    return this.currentStageIndex >= this.totalStages - 1 ? 'Complete Refactor Lesson →' : 'Advance to Next Stage →';
  }
  get totalBrierPoints() {
    return this.results.reduce((sum, r) => sum + (r.brierResult ? r.brierResult.pointsAwarded : 0), 0);
  }
  get quadrantLabel() {
    if (this.results.length === 0) return 'Calibrated Humility';
    const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / this.results.length;
    if (avgConfidence >= 0.80) {
      return 'Calibrated Conviction (Elite Architect)';
    }
    return 'Hesitant Mastery (Procedural Discipline)';
  }
  handleSelectOption(event) {
    if (this.isStageSuccess) return;
    this.selectedOptionId = event.currentTarget.dataset.id;
    this.showCoachingAlert = false;
  }
  handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleSelectOption(event);
    }
  }
  handleConfidenceSelected(event) {
    if (this.isStageSuccess) return;
    this.selectedConfidence = event.detail.confidence;
  }
  handleSubmitStageDecision() {
    if (this.isSubmitDisabled) return;
    const options = this.currentStage.options || [];
    const selectedOpt = options.find(o => o.id === this.selectedOptionId);
    if (!selectedOpt) return;
    const isCorrect = selectedOpt.isCorrect === true;
    const brierResult = ArcGymScoringEngine.calculateDecisionScore(this.selectedConfidence, isCorrect);
    this.lastBrierResult = brierResult;
    if (isCorrect) {
      this.isStageSuccess = true;
      this.showCoachingAlert = false;
      this.results.push({
        stageId: this.currentStage.id,
        selectedOptionId: this.selectedOptionId,
        confidence: this.selectedConfidence,
        brierResult
      });
    } else {
      this.showCoachingAlert = true;
      this.coachingMessage = selectedOpt.coachingNote;
    }
  }
  handleNextStage() {
    if (this.currentStageIndex < this.totalStages - 1) {
      this.currentStageIndex++;
      this.selectedOptionId = null;
      this.selectedConfidence = null;
      this.isStageSuccess = false;
      this.showCoachingAlert = false;
      this.coachingMessage = '';
      this.lastBrierResult = null;
    } else {
      this.finishLesson();
    }
  }
  finishLesson() {
    this.isComplete = true;
    this.streakDays = saveStreakToStorage();
    this.dispatchEvent(new CustomEvent('drillcomplete', {
      detail: {
        drillId: this.activeLesson.id,
        totalStages: this.totalStages,
        totalBrierPoints: this.totalBrierPoints,
        quadrant: this.quadrantLabel,
        streakDays: this.streakDays,
        results: this.results
      },
      bubbles: true,
      composed: true
    }));
  }
  handleRestart() {
    this.currentStageIndex = 0;
    this.selectedOptionId = null;
    this.selectedConfidence = null;
    this.isStageSuccess = false;
    this.showCoachingAlert = false;
    this.coachingMessage = '';
    this.isComplete = false;
    this.results = [];
    this.lastBrierResult = null;
  }
  /*LWC compiler v8.28.2*/
}
LessonStepper.LETTERS = ['A', 'B', 'C', 'D'];
_registerDecorators(LessonStepper, {
  publicProps: {
    drill: {
      config: 0
    }
  },
  track: {
    currentStageIndex: 1,
    selectedOptionId: 1,
    selectedConfidence: 1,
    isStageSuccess: 1,
    showCoachingAlert: 1,
    coachingMessage: 1,
    isComplete: 1,
    results: 1,
    streakDays: 1,
    lastBrierResult: 1
  }
});
const __lwc_component_class_internal = _registerComponent(LessonStepper, {
  tmpl: _tmpl,
  sel: "c-lesson-stepper",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;