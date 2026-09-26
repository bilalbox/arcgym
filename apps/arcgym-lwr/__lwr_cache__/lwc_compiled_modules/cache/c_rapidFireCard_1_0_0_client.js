import { registerDecorators as _registerDecorators, LightningElement, registerComponent as _registerComponent } from "lwc";
import _tmpl from "./rapidFireCard.html";
class RapidFireCard extends LightningElement {
  constructor(...args) {
    super(...args);
    this.prompt = '';
    this.options = [];
    this.selectedOptionId = null;
    this.isAnswered = false;
    this.disabled = false;
  }
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
      detail: {
        optionId
      },
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
  /*LWC compiler v8.28.2*/
}
RapidFireCard.LETTERS = ['A', 'B', 'C', 'D'];
_registerDecorators(RapidFireCard, {
  publicProps: {
    prompt: {
      config: 0
    },
    options: {
      config: 0
    },
    selectedOptionId: {
      config: 0
    },
    isAnswered: {
      config: 0
    },
    disabled: {
      config: 0
    }
  }
});
const __lwc_component_class_internal = _registerComponent(RapidFireCard, {
  tmpl: _tmpl,
  sel: "c-rapid-fire-card",
  apiVersion: 66,
  enableSyntheticElementInternals: true
});
export default __lwc_component_class_internal;