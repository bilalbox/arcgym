import { LightningElement, wire, track } from 'lwc';
import getTodayDrill from '@salesforce/apex/ArcGymDrillController.getTodayDrill';
import recordAttempt from '@salesforce/apex/ArcGymDrillController.recordAttempt';
import getUserStreak from '@salesforce/apex/ArcGymDrillController.getUserStreak';

export default class ArcGymUtilityBar extends LightningElement {
    @track activeFormat = 'Rapid_Fire';
    @track currentStreak = 1;
    @track drillData = null;
    isLoading = true;

    @wire(getUserStreak)
    wiredStreak({ data }) {
        if (data !== undefined) {
            this.currentStreak = data;
        }
    }

    @wire(getTodayDrill)
    wiredDrill({ data, error }) {
        this.isLoading = false;
        if (data) {
            try {
                const parsedSteps = data.definitionJson ? JSON.parse(data.definitionJson) : {};
                this.drillData = {
                    id: data.id,
                    title: data.title,
                    format: data.format,
                    domain: data.domain,
                    difficulty: data.difficulty,
                    pillars: data.pillars,
                    steps: parsedSteps.steps || [],
                    categories: parsedSteps.categories || [],
                    moves: parsedSteps.moves || [],
                    stages: parsedSteps.stages || []
                };
            } catch (e) {
                this.drillData = null;
            }
        }
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
        return `utility-pill ${this.isRapidFire ? 'utility-pill_active' : ''}`;
    }

    get currencyPillClass() {
        return `utility-pill ${this.isCurrency ? 'utility-pill_active' : ''}`;
    }

    get scenarioPillClass() {
        return `utility-pill ${this.isScenario ? 'utility-pill_active' : ''}`;
    }

    get lessonPillClass() {
        return `utility-pill ${this.isLesson ? 'utility-pill_active' : ''}`;
    }

    handleSelectFormat(event) {
        const format = event.currentTarget.dataset.format;
        if (format) {
            this.activeFormat = format;
        }
    }

    handleDrillComplete(event) {
        const detail = event.detail || {};
        const score = detail.totalBrierPoints || detail.brierPoints || 0;
        const brierScore = detail.brierScore || 0.85;
        const responsesJson = JSON.stringify(detail);
        const streak = detail.streakDays || this.currentStreak + 1;
        this.currentStreak = streak;

        // Persist attempt privately to ArcGym_Attempt__c in this Salesforce org
        recordAttempt({
            drillId: detail.drillId || (this.drillData ? this.drillData.id : 'AGD-DEFAULT'),
            score: score,
            brierScore: brierScore,
            responsesJson: responsesJson,
            streakCount: streak
        }).then(result => {
            if (result && result.currentStreak) {
                this.currentStreak = result.currentStreak;
            }
        }).catch(err => {
            console.error('Failed to log in-org attempt:', err);
        });
    }
}
