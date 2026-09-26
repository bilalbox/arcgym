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

const DEFAULT_DRILL = {
    id: 'curr-checkout-01',
    title: 'High-Throughput Order Ingestion & Fraud Risk Pipeline',
    domain: 'Core Platform & Governor Capacity',
    totalBudget: 100,
    unitLabel: 'Governor Points',
    budgetTitle: 'Transaction Execution Envelope',
    scenarioPrompt: 'Your checkout pipeline must process 50,000 orders/hour with SLA < 2 seconds. Synchronous execution budget is capped at 100 Governor Points (representing SOQL, CPU, Heap, and Callout limits). If allocated points exceed 100, transactions blow platform limits under peak load.',
    citationUrl: 'https://architect.salesforce.com/design/decision-guides/event-driven',
    categories: [
        {
            id: 'cat_validation',
            title: '1. Validation & Deduplication Tier',
            description: 'Mechanism to prevent duplicate orders and validate SKU parameters.',
            options: [
                {
                    id: 'opt_val_a',
                    name: 'In-Memory Map Cache + External ID Set Lookup',
                    cost: 15,
                    isOptimal: true,
                    details: 'Sub-millisecond duplicate checks using in-memory set hashing. Fully bulkified single SOQL query.'
                },
                {
                    id: 'opt_val_b',
                    name: 'Record-Triggered Flow with Get Records inside Loop',
                    cost: 45,
                    isOptimal: false,
                    details: 'Consumes 1 SOQL query per record iteration; instantly exceeds the 100 SOQL limit at 100 orders.'
                },
                {
                    id: 'opt_val_c',
                    name: 'Synchronous REST Callout to External Master Data System',
                    cost: 35,
                    isOptimal: false,
                    details: 'High latency overhead (~400ms per order), consumes callout limits and blocks database worker thread.'
                }
            ]
        },
        {
            id: 'cat_inventory',
            title: '2. Inventory Reservation & Locking',
            description: 'Concurrency control when 500 customers check out the same product simultaneously.',
            options: [
                {
                    id: 'opt_inv_a',
                    name: 'Pessimistic DB Record Locking (FOR UPDATE) across all rows',
                    cost: 40,
                    isOptimal: false,
                    details: 'Causes catastrophic record-locking contention (UNABLE_TO_LOCK_ROW) under concurrent flash sales.'
                },
                {
                    id: 'opt_inv_b',
                    name: 'Asynchronous High-Volume Platform Event with Replay Handler',
                    cost: 20,
                    isOptimal: true,
                    details: 'Decouples transaction boundary; reservation queues into high-speed event bus with guaranteed sequence.'
                },
                {
                    id: 'opt_inv_c',
                    name: 'Scheduled Hourly Batch Apex Sync',
                    cost: 10,
                    isOptimal: false,
                    details: 'Leaves a 60-minute window of phantom inventory; causes severe overselling and customer cancellations.'
                }
            ]
        },
        {
            id: 'cat_fraud',
            title: '3. Fraud & Risk Scoring',
            description: 'Real-time calculation of risk score prior to payment capture.',
            options: [
                {
                    id: 'opt_fraud_a',
                    name: 'Data Cloud Zero Copy Query to Databricks ML Feature Store',
                    cost: 25,
                    isOptimal: true,
                    details: 'Queries external feature store in place without ETL or data copies. Minimal CRM CPU footprint.'
                },
                {
                    id: 'opt_fraud_b',
                    name: 'Apex HTTP Callout with 10-second timeout to 3rd-party API',
                    cost: 45,
                    isOptimal: false,
                    details: 'Exhausts concurrent long-running transaction limits during traffic surges, degrading whole org.'
                },
                {
                    id: 'opt_fraud_c',
                    name: 'Client-Side JavaScript Validation in Experience Cloud',
                    cost: 5,
                    isOptimal: false,
                    details: 'Severe Trust violation. Fraudulent bots trivially bypass client-side JavaScript rules.'
                }
            ]
        },
        {
            id: 'cat_notification',
            title: '4. Post-Commit Confirmation & Notifications',
            description: 'Order receipt generation and external ERP event egress.',
            options: [
                {
                    id: 'opt_notif_a',
                    name: 'Messaging.SingleEmailMessage invoked per record in trigger',
                    cost: 35,
                    isOptimal: false,
                    details: 'Rapidly exhausts daily single-email platform limits and triggers CPU timeout exceptions.'
                },
                {
                    id: 'opt_notif_b',
                    name: 'Publish Change Data Capture (CDC) Event to Integration Bus',
                    cost: 15,
                    isOptimal: true,
                    details: 'Guarantees reliable, decoupled external event delivery completely off the core execution thread.'
                },
                {
                    id: 'opt_notif_c',
                    name: 'Synchronous Outbound SOAP Web Service Call',
                    cost: 30,
                    isOptimal: false,
                    details: 'Deprecated legacy pattern with heavy XML serialization overhead and tight endpoint coupling.'
                }
            ]
        }
    ]
};

export default class CurrencyRunner extends LightningElement {
    @api drill;

    @track selectedOptions = {};
    @track selectedConfidence = null;
    @track isAnswered = false;
    @track isComplete = false;
    @track streakDays = 1;
    @track brierResult = null;
    @track isCorrect = false;

    static LETTERS = ['A', 'B', 'C', 'D'];

    connectedCallback() {
        this.streakDays = loadStreakFromStorage();
        // Initialize default selections to the first option of each category for immediate interactivity
        const drillData = this.activeDrill;
        if (drillData && drillData.categories) {
            drillData.categories.forEach(cat => {
                if (cat.options && cat.options.length > 0) {
                    this.selectedOptions[cat.id] = cat.options[0].id;
                }
            });
        }
    }

    get activeDrill() {
        return this.drill || DEFAULT_DRILL;
    }

    get drillTitle() {
        return this.activeDrill.title;
    }

    get drillDomain() {
        return this.activeDrill.domain;
    }

    get scenarioPrompt() {
        return this.activeDrill.scenarioPrompt;
    }

    get totalBudget() {
        return this.activeDrill.totalBudget;
    }

    get unitLabel() {
        return this.activeDrill.unitLabel;
    }

    get budgetTitle() {
        return this.activeDrill.budgetTitle;
    }

    get citationUrl() {
        return this.activeDrill.citationUrl;
    }

    get totalAllocatedCost() {
        let total = 0;
        const categories = this.activeDrill.categories || [];
        for (const cat of categories) {
            const selectedOptId = this.selectedOptions[cat.id];
            if (selectedOptId) {
                const opt = cat.options.find(o => o.id === selectedOptId);
                if (opt) {
                    total += opt.cost;
                }
            }
        }
        return total;
    }

    get isOverBudget() {
        return this.totalAllocatedCost > this.totalBudget;
    }

    get isAllCategoriesSelected() {
        const categories = this.activeDrill.categories || [];
        return categories.every(cat => !!this.selectedOptions[cat.id]);
    }

    get isCommitDisabled() {
        return this.isOverBudget || !this.isAllCategoriesSelected || this.selectedConfidence === null || this.isAnswered;
    }

    get formattedCategories() {
        const categories = this.activeDrill.categories || [];
        return categories.map(cat => {
            const selectedOptId = this.selectedOptions[cat.id];
            const options = (cat.options || []).map((opt, index) => {
                const letter = CurrencyRunner.LETTERS[index] || String.fromCharCode(65 + index);
                const isSelected = selectedOptId === opt.id;

                let cardClass = 'option-pill';
                let costBadgeClass = 'slds-badge cost-badge';

                if (this.isAnswered) {
                    if (opt.isOptimal) {
                        cardClass += ' option-pill_optimal';
                        costBadgeClass += ' slds-theme_success';
                    } else if (isSelected) {
                        cardClass += ' option-pill_flawed';
                        costBadgeClass += ' slds-theme_error';
                    } else {
                        cardClass += ' option-pill_dimmed';
                    }
                } else {
                    if (isSelected) {
                        cardClass += ' option-pill_selected';
                        costBadgeClass += ' slds-theme_inverse';
                    }
                }

                return {
                    ...opt,
                    letter,
                    isSelected,
                    cardClass,
                    costBadgeClass
                };
            });

            return {
                ...cat,
                options
            };
        });
    }

    get feedbackClass() {
        let base = 'feedback-banner slds-box slds-box_small slds-m-bottom_medium';
        if (this.isCorrect) {
            return `${base} feedback-correct`;
        }
        if (this.brierResult && this.brierResult.overconfidencePenaltyApplied) {
            return `${base} feedback-overconfident`;
        }
        return `${base} feedback-incorrect`;
    }

    get feedbackTitle() {
        if (this.isCorrect) {
            return '✓ Architecture Validated (Within Budget & Optimal)';
        }
        if (this.brierResult && this.brierResult.overconfidencePenaltyApplied) {
            return '⚠ Severe Governor Limit / Antipattern (2.5x Penalty)';
        }
        return '✗ Architectural Failure Detected';
    }

    get brierPointsLabel() {
        if (!this.brierResult) return '';
        const pts = this.brierResult.pointsAwarded;
        return pts >= 0 ? `+${pts} Brier pts` : `${pts} Brier pts`;
    }

    get evaluationRationale() {
        if (this.isOverBudget) {
            return `Budget Blown: Total allocation (${this.totalAllocatedCost} pts) exceeded the ${this.totalBudget} point platform execution envelope. The transaction throws runtime limit exceptions under load.`;
        }
        if (this.isCorrect) {
            return `Optimal Architectural Design! Allocation consumed ${this.totalAllocatedCost}/${this.totalBudget} Governor Points, leaving a healthy buffer for unpredictable peak traffic while using asynchronous decoupling and Zero Copy.`;
        }
        return `Sub-optimal Pattern Selection: While under budget, chosen options include synchronous trigger callouts, pessimistic record locking, or loop queries that violate Well-Architected Reliability standards.`;
    }

    get earnedPoints() {
        return this.brierResult ? this.brierResult.pointsAwarded : 0;
    }

    get quadrantLabel() {
        if (!this.brierResult) return 'Calibrated Humility';
        switch (this.brierResult.quadrant) {
            case 'Calibrated_Conviction':
                return 'Calibrated Conviction (Elite Architect)';
            case 'Hesitant_Mastery':
                return 'Hesitant Mastery (Imposter Zone)';
            case 'Hazardous_Assumption':
                return 'Hazardous Assumption (Catastrophic Risk)';
            default:
                return 'Calibrated Humility (Wise Prudence)';
        }
    }

    handleSelectOption(event) {
        if (this.isAnswered) return;
        const categoryId = event.currentTarget.dataset.categoryId;
        const optionId = event.currentTarget.dataset.optionId;
        this.selectedOptions = {
            ...this.selectedOptions,
            [categoryId]: optionId
        };
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleSelectOption(event);
        }
    }

    handleConfidenceSelected(event) {
        if (this.isAnswered) return;
        this.selectedConfidence = event.detail.confidence;
    }

    handleCommitConfiguration() {
        if (this.isCommitDisabled) return;

        // Check if all selected options are optimal and under budget
        const categories = this.activeDrill.categories || [];
        let allOptimal = !this.isOverBudget;

        for (const cat of categories) {
            const selectedOptId = this.selectedOptions[cat.id];
            const opt = cat.options.find(o => o.id === selectedOptId);
            if (!opt || !opt.isOptimal) {
                allOptimal = false;
            }
        }

        this.isCorrect = allOptimal;
        this.brierResult = ArcGymScoringEngine.calculateDecisionScore(this.selectedConfidence, this.isCorrect);
        this.isAnswered = true;

        this.dispatchEvent(new CustomEvent('currencycommit', {
            detail: {
                drillId: this.activeDrill.id,
                totalAllocatedCost: this.totalAllocatedCost,
                totalBudget: this.totalBudget,
                isCorrect: this.isCorrect,
                confidence: this.selectedConfidence,
                brierResult: this.brierResult,
                selectedOptions: this.selectedOptions
            },
            bubbles: true,
            composed: true
        }));
    }

    handleFinishDrill() {
        this.isComplete = true;
        this.streakDays = saveStreakToStorage();

        this.dispatchEvent(new CustomEvent('drillcomplete', {
            detail: {
                drillId: this.activeDrill.id,
                totalBudget: this.totalBudget,
                usedBudget: this.totalAllocatedCost,
                isCorrect: this.isCorrect,
                brierPoints: this.earnedPoints,
                quadrant: this.quadrantLabel,
                streakDays: this.streakDays
            },
            bubbles: true,
            composed: true
        }));
    }

    handleRestart() {
        this.selectedConfidence = null;
        this.isAnswered = false;
        this.isComplete = false;
        this.brierResult = null;
        this.isCorrect = false;

        const drillData = this.activeDrill;
        if (drillData && drillData.categories) {
            drillData.categories.forEach(cat => {
                if (cat.options && cat.options.length > 0) {
                    this.selectedOptions[cat.id] = cat.options[0].id;
                }
            });
        }
    }
}
