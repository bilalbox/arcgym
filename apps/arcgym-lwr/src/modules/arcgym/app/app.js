import { LightningElement, track } from 'lwc';

export default class App extends LightningElement {
    @track streakDays = 1;
    isAuthenticated = false;

    todayDrill = {
        id: 'AGD-00101',
        title: 'Core Platform & Agentic Architecture Trade-Offs',
        format: 'Rapid Fire',
        domain: 'Core Platform & Agentforce',
        prompt: 'AI generates functional Apex in seconds. You are responsible for blast radius, governor limit resilience, and transaction boundary integrity.',
        pillars: ['Reliability', 'Trust', 'Operational_Excellence']
    };

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
}
