import { LightningElement, api } from 'lwc';

export default class ConfidenceGate extends LightningElement {
    @api selectedConfidence = null;
    @api disabled = false;

    rawAnchors = [
        {
            value: 0.50,
            percentLabel: '50%',
            title: 'Speculative',
            tooltip: 'Toss-up or early exploration. Safe yield even if incorrect.'
        },
        {
            value: 0.70,
            percentLabel: '70%',
            title: 'Plausible',
            tooltip: 'Standard design heuristic pattern in most scenarios.'
        },
        {
            value: 0.85,
            percentLabel: '85%',
            title: 'High Conviction',
            tooltip: 'Battle-tested Well-Architected recommendation.'
        },
        {
            value: 0.95,
            percentLabel: '95%',
            title: 'Architectural Axiom',
            tooltip: 'Hard governor limit or core security boundary. 2.5x penalty if wrong!'
        }
    ];

    get anchors() {
        return this.rawAnchors.map(anchor => {
            const isSelected = this.selectedConfidence === anchor.value;
            const baseClass = 'slds-button confidence-chip';
            const selectedClass = isSelected ? 'confidence-chip_active' : '';
            return {
                ...anchor,
                isSelected,
                cssClass: `${baseClass} ${selectedClass}`.trim()
            };
        });
    }

    handleSelectAnchor(event) {
        if (this.disabled) return;
        const val = parseFloat(event.currentTarget.dataset.value);
        this.selectedConfidence = val;

        const anchor = this.rawAnchors.find(a => a.value === val);

        this.dispatchEvent(new CustomEvent('confidenceselected', {
            detail: {
                confidence: val,
                title: anchor ? anchor.title : ''
            },
            bubbles: true,
            composed: true
        }));
    }
}
