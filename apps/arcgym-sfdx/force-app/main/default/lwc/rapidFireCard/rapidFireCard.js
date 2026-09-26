import { LightningElement, api } from 'lwc';

export default class RapidFireCard extends LightningElement {
    @api prompt = '';
    @api options = [];
    @api selectedOptionId = null;
    @api isAnswered = false;
    @api disabled = false;

    static LETTERS = ['A', 'B', 'C', 'D'];

    get formattedOptions() {
        if (!this.options || !Array.isArray(this.options)) return [];

        return this.options.map((opt, index) => {
            const letter = RapidFireCard.LETTERS[index] || String.fromCharCode(65 + index);
            const isSelected = this.selectedOptionId === opt.id;

            let cardClass = 'option-card';

            if (this.isAnswered) {
                if (opt.isCorrect) {
                    cardClass += ' option-card_correct';
                } else if (isSelected) {
                    cardClass += ' option-card_incorrect';
                } else {
                    cardClass += ' option-card_dimmed';
                }
            } else {
                if (isSelected) {
                    cardClass += ' option-card_selected';
                }
                if (this.disabled) {
                    cardClass += ' option-card_disabled';
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

    handleSelectOption(event) {
        if (this.disabled || this.isAnswered) return;
        const optionId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('optionselect', {
            detail: { optionId },
            bubbles: true,
            composed: true
        }));
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleSelectOption(event);
        }
    }
}
