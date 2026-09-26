import { LightningElement } from 'lwc';
import { ArcGymScoringEngine } from '@arcgym/drill-core';

export default class App extends LightningElement {
    streakDays = 1;
    isAuthenticated = false;
    selectedConfidence = null;
    selectedOption = 'A';

    todayDrill = {
        id: 'AGD-00101',
        title: 'Core Platform & Integration: Scale vs. Coupling in Order Processing',
        format: 'Rapid Fire',
        domain: 'Enterprise Integration & Scalability',
        prompt: 'AI generates functional Apex in seconds. You are responsible for blast radius, governor limit resilience, and transaction boundary integrity.',
        pillars: ['Reliability', 'Operational_Excellence', 'Cost_Optimization']
    };

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
}
