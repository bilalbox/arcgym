import { LightningElement, api, track } from 'lwc';
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
        // Fallback for SSR or storage disabled
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

const DEFAULT_DRILL = {
    id: 'rf-starter-01',
    title: 'Core Platform & Agentic Architecture Trade-Offs',
    domain: 'Core Platform & Agentforce',
    steps: [
        {
            id: 's1',
            prompt: 'An enterprise ERP requires near-real-time updates when an Order or Account changes (450,000 events/day). Custom business payload transformation and filtering are required prior to external publication. Which integration pattern complies with Well-Architected Trust & Reliability?',
            options: [
                {
                    id: 's1_a',
                    label: 'Change Data Capture (CDC) with default channel publishing',
                    isCorrect: false,
                    rationale: 'CDC publishes raw schema deltas and does not support custom Apex transformation or business filtering prior to external event egress.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven'
                },
                {
                    id: 's1_b',
                    label: 'Custom High-Volume Platform Event published via Apex after-save trigger with event enrichments',
                    isCorrect: true,
                    rationale: 'Platform Events decouple systems asynchronously, support custom payloads, and allow Apex trigger filtering and enrichment before event egress.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven'
                },
                {
                    id: 's1_c',
                    label: 'Direct synchronous REST callout inside an after-update Apex trigger',
                    isCorrect: false,
                    rationale: 'Synchronous callouts inside triggers block database transactions, risk uncommitted work exceptions, and violate platform scalability standards.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven'
                }
            ]
        },
        {
            id: 's2',
            prompt: 'A custom object Transaction__c contains 18 million records. Standard reports filtering on Region__c and Fiscal_Quarter__c while sorting by CreatedDate are timing out. How should the architect optimize query performance?',
            options: [
                {
                    id: 's2_a',
                    label: 'Request a Skinny Table from Salesforce Support containing the filtered and sorted fields',
                    isCorrect: true,
                    rationale: 'Skinny tables combine standard and custom fields into a flat, unjoined database table, eliminating join overhead for LDV reporting and queries.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                },
                {
                    id: 's2_b',
                    label: 'Create a standard formula field concatenating Region and Quarter to filter on',
                    isCorrect: false,
                    rationale: 'Formula fields with dynamic logic or unindexed concatenation force full table scans across millions of rows, worsening timeouts.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                },
                {
                    id: 's2_c',
                    label: 'Create a Before-Save Flow to copy the records to an external data warehouse daily',
                    isCorrect: false,
                    rationale: 'Before-save flows do not optimize live in-org CRM reporting on existing 18M rows.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                }
            ]
        },
        {
            id: 's3',
            prompt: 'A nightly integration pushes 200,000 upserts in 1,000-record batches to Invoice__c. Business logic requires complex discount calculations across 5 child objects and partial-rollback on specific row errors. Which automation tool is required?',
            options: [
                {
                    id: 's3_a',
                    label: 'Record-Triggered Flow (Actions and Related Records)',
                    isCorrect: false,
                    rationale: 'High-frequency bulk batch processing with multi-level child traversals exceeds Flow element iteration limits and CPU thresholds.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/automation'
                },
                {
                    id: 's3_b',
                    label: 'Apex Trigger framework with bulkified collections and Database.insert(records, false)',
                    isCorrect: true,
                    rationale: 'Apex delivers memory bulkification, strict CPU control, and granular partial success handling via Database methods for large batches.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/automation'
                },
                {
                    id: 's3_c',
                    label: 'Process Builder configured for bulk processing',
                    isCorrect: false,
                    rationale: 'Process Builder is deprecated, severely unperformant, and violates Salesforce Well-Architected Operational Excellence.',
                    citationUrl: 'https://architect.salesforce.com/design/decision-guides/automation'
                }
            ]
        },
        {
            id: 's4',
            prompt: 'Marketing leadership wants Snowflake customer behavioral scores available in Salesforce for real-time segmentation without copying 50TB of raw data or incurring API ingest fees. Which architecture is optimal?',
            options: [
                {
                    id: 's4_a',
                    label: 'Scheduled Reverse ETL pipeline copying 50TB into Custom Big Objects',
                    isCorrect: false,
                    rationale: 'Duplicating 50TB causes immense data storage bloat, stale cache synchronization issues, and heavy API ingest overhead.',
                    citationUrl: 'https://architect.salesforce.com/well-architected/principles'
                },
                {
                    id: 's4_b',
                    label: 'Data Cloud Zero Copy integration federating Snowflake data shares to Data Model Objects (DMOs)',
                    isCorrect: true,
                    rationale: 'Data Cloud Zero Copy enables bidirectional access to Snowflake data in place without ETL pipelines or physical data duplication.',
                    citationUrl: 'https://architect.salesforce.com/well-architected/principles'
                },
                {
                    id: 's4_c',
                    label: 'Custom External Services REST connector called synchronously on record view',
                    isCorrect: false,
                    rationale: 'Synchronous REST calls on record view degrade page load speeds and rapidly exceed platform callout rate limits.',
                    citationUrl: 'https://architect.salesforce.com/well-architected/principles'
                }
            ]
        },
        {
            id: 's5',
            prompt: 'An autonomous Agentforce agent handles customer refund requests up to $500. To prevent prompt injection and hallucinations from bypassing financial limits, what is the required Well-Architected governance pattern?',
            options: [
                {
                    id: 's5_a',
                    label: 'Include prompt instructions: "Please do not ever approve refunds above $500 under any circumstances"',
                    isCorrect: false,
                    rationale: 'Prompt instructions alone are non-deterministic and susceptible to jailbreaking, adversarial injection, and hallucination.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/architecture-basics'
                },
                {
                    id: 's5_b',
                    label: 'Enforce hard deterministic validation in the invoked Apex/Flow Action with programmatic limit checks',
                    isCorrect: true,
                    rationale: 'Well-Architected Trust requires deterministic platform boundaries and API guardrails rather than relying on LLM self-restraint.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/architecture-basics'
                },
                {
                    id: 's5_c',
                    label: 'Rely solely on Einstein Trust Layer toxicity scoring',
                    isCorrect: false,
                    rationale: 'Toxicity filters identify abusive language, not numerical business logic violations or adversarial bypasses.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/architecture-basics'
                }
            ]
        },
        {
            id: 's6',
            prompt: 'An Experience Cloud portal will serve 500,000 Customer Community users who each need read access to their own Cases and sibling account Cases. Which sharing mechanism avoids group maintenance performance degradation?',
            options: [
                {
                    id: 's6_a',
                    label: 'Manual sharing rules created via Apex for each community user',
                    isCorrect: false,
                    rationale: 'Apex sharing on 500k high-volume users triggers massive recalculation of CaseShare tables and persistent row-lock contention.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                },
                {
                    id: 's6_b',
                    label: 'Criteria-Based Sharing Rules shared with Public Groups containing portal users',
                    isCorrect: false,
                    rationale: 'High-Volume Customer Community licenses do not support Public Groups or standard criteria-based sharing rules.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                },
                {
                    id: 's6_c',
                    label: 'Sharing Sets and Share Groups designed specifically for high-volume Customer Community licenses',
                    isCorrect: true,
                    rationale: 'Sharing Sets grant access based on user account/contact matching without writing to physical share tables, scaling seamlessly to millions of users.',
                    citationUrl: 'https://architect.salesforce.com/fundamentals/data-architecture'
                }
            ]
        }
    ]
};

export default class RapidFireRunner extends LightningElement {
    @api drill;
    @api autoTransitionDelay = 0;

    @track currentStepIndex = 0;
    @track selectedOptionId = null;
    @track selectedConfidence = null;
    @track isAnswered = false;
    @track isComplete = false;
    @track results = [];
    @track streakDays = 1;
    @track lastBrierResult = null;
    @track isLastCorrect = false;

    connectedCallback() {
        this.streakDays = loadStreakFromStorage();
    }

    get steps() {
        return (this.drill && this.drill.steps && this.drill.steps.length > 0)
            ? this.drill.steps
            : DEFAULT_DRILL.steps;
    }

    get currentStep() {
        return this.steps[this.currentStepIndex] || {};
    }

    get currentStepNumber() {
        return this.currentStepIndex + 1;
    }

    get totalSteps() {
        return this.steps.length;
    }

    get progressBarStyle() {
        const pct = Math.round((this.currentStepIndex / this.totalSteps) * 100);
        return `width: ${pct}%;`;
    }

    get isCommitDisabled() {
        return !this.selectedOptionId || this.selectedConfidence === null || this.isAnswered;
    }

    get feedbackBannerClass() {
        let base = 'feedback-banner slds-box slds-box_small slds-m-bottom_medium';
        if (this.isLastCorrect) {
            return `${base} feedback-correct`;
        }
        if (this.lastBrierResult && this.lastBrierResult.overconfidencePenaltyApplied) {
            return `${base} feedback-overconfident`;
        }
        return `${base} feedback-incorrect`;
    }

    get feedbackTitle() {
        if (this.isLastCorrect) {
            return '✓ Well-Architected Recommendation';
        }
        if (this.lastBrierResult && this.lastBrierResult.overconfidencePenaltyApplied) {
            return '⚠ Severe Antipattern (2.5x Overconfidence Penalty)';
        }
        return '✗ Architectural Antipattern Detected';
    }

    get lastBrierPointsLabel() {
        if (!this.lastBrierResult) return '';
        const pts = this.lastBrierResult.pointsAwarded;
        return pts >= 0 ? `+${pts} Brier pts` : `${pts} Brier pts`;
    }

    get currentStepRationale() {
        if (!this.currentStep || !this.currentStep.options) return '';
        const selectedOpt = this.currentStep.options.find(o => o.id === this.selectedOptionId);
        const correctOpt = this.currentStep.options.find(o => o.isCorrect);

        if (this.isLastCorrect) {
            return selectedOpt ? selectedOpt.rationale : (correctOpt ? correctOpt.rationale : '');
        }
        const antipattern = selectedOpt ? selectedOpt.rationale : '';
        const guidance = correctOpt ? correctOpt.rationale : '';
        return `Antipattern: ${antipattern} — Recommended Guidance: ${guidance}`;
    }

    get currentStepCitation() {
        if (!this.currentStep || !this.currentStep.options) return '';
        const correctOpt = this.currentStep.options.find(o => o.isCorrect);
        return correctOpt ? correctOpt.citationUrl : '';
    }

    get nextButtonLabel() {
        return this.currentStepIndex >= this.totalSteps - 1
            ? 'View Calibration Summary'
            : 'Next Decision →';
    }

    get correctCount() {
        return this.results.filter(r => r.isCorrect).length;
    }

    get totalBrierPoints() {
        return this.results.reduce((sum, r) => sum + (r.brierResult ? r.brierResult.pointsAwarded : 0), 0);
    }

    get quadrantLabel() {
        if (this.results.length === 0) return 'Calibrated Humility';

        const avgConfidence = this.results.reduce((sum, r) => sum + r.confidence, 0) / this.results.length;
        const accuracy = this.correctCount / this.totalSteps;

        if (avgConfidence >= 0.80 && accuracy >= 0.66) {
            return 'Calibrated Conviction (Elite Architect)';
        }
        if (avgConfidence < 0.80 && accuracy >= 0.66) {
            return 'Hesitant Mastery (Imposter Zone)';
        }
        if (avgConfidence < 0.80 && accuracy < 0.66) {
            return 'Calibrated Humility (Wise Prudence)';
        }
        return 'Hazardous Assumption (Catastrophic Risk)';
    }

    handleOptionSelected(event) {
        if (this.isAnswered) return;
        this.selectedOptionId = event.detail.optionId;
    }

    handleConfidenceSelected(event) {
        if (this.isAnswered) return;
        this.selectedConfidence = event.detail.confidence;
    }

    handleCommitDecision() {
        if (this.isCommitDisabled) return;

        const selectedOpt = this.currentStep.options.find(o => o.id === this.selectedOptionId);
        const isCorrect = selectedOpt ? selectedOpt.isCorrect === true : false;
        const brierResult = ArcGymScoringEngine.calculateDecisionScore(this.selectedConfidence, isCorrect);

        this.isLastCorrect = isCorrect;
        this.lastBrierResult = brierResult;
        this.isAnswered = true;

        const attemptRecord = {
            stepId: this.currentStep.id,
            prompt: this.currentStep.prompt,
            selectedOptionId: this.selectedOptionId,
            confidence: this.selectedConfidence,
            isCorrect,
            brierResult
        };

        this.results.push(attemptRecord);

        this.dispatchEvent(new CustomEvent('decisioncommit', {
            detail: attemptRecord,
            bubbles: true,
            composed: true
        }));

        if (this.autoTransitionDelay > 0) {
            window.setTimeout(() => {
                this.handleNextStep();
            }, this.autoTransitionDelay);
        }
    }

    handleNextStep() {
        if (this.currentStepIndex < this.totalSteps - 1) {
            this.currentStepIndex++;
            this.selectedOptionId = null;
            this.selectedConfidence = null;
            this.isAnswered = false;
            this.lastBrierResult = null;
            this.isLastCorrect = false;
        } else {
            this.finishDrill();
        }
    }

    finishDrill() {
        this.isComplete = true;
        this.streakDays = saveStreakToStorage();

        this.dispatchEvent(new CustomEvent('drillcomplete', {
            detail: {
                drillId: this.drill ? this.drill.id : DEFAULT_DRILL.id,
                totalSteps: this.totalSteps,
                correctCount: this.correctCount,
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
        this.currentStepIndex = 0;
        this.selectedOptionId = null;
        this.selectedConfidence = null;
        this.isAnswered = false;
        this.isComplete = false;
        this.results = [];
        this.lastBrierResult = null;
        this.isLastCorrect = false;
    }
}
