import _implicitStylesheets from "./lessonStepper.css";
import _implicitScopedStylesheets from "./lessonStepper.scoped.css?scoped=true";
import _cConfidenceGate from "c/confidenceGate";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="lesson-tag slds-badge slds-theme_success${0}"${2}>LESSON: 4-STAGE REFACTOR</span><span class="stage-indicator font-weight-bold${0}"${2}>${"t4"}</span></div>`;
const $fragment2 = parseFragment`<h2 class="slds-text-heading_medium font-weight-bold slds-m-bottom_x-small${0}"${2}>${"t1"}</h2>`;
const $fragment3 = parseFragment`<p class="lesson-domain slds-text-color_weak slds-m-bottom_small${0}"${2}>${"t1"}</p>`;
const $fragment4 = parseFragment`<div${"c0"}${2}><span class="wizard-step-circle${0}"${2}>${"t2"}</span><span class="wizard-step-title${0}"${2}>${"t4"}</span></div>`;
const $fragment5 = parseFragment`<div class="slds-grid slds-grid_align-spread slds-m-bottom_xx-small${0}"${2}><span class="inspection-badge font-weight-bold${0}"${2}>${"t2"}</span><span class="slds-badge slds-badge_lightest${0}"${2}>${"t4"}</span></div>`;
const $fragment6 = parseFragment`<h3 class="inspection-title font-weight-bold slds-m-bottom_x-small${0}"${2}>${"t1"}</h3>`;
const $fragment7 = parseFragment`<pre class="code-preview slds-m-top_x-small${0}"${2}><code${3}>${"t2"}</code></pre>`;
const $fragment8 = parseFragment`<div${"c0"}${"a0:data-id"} role="radio"${"a0:aria-checked"} tabindex="0"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="option-marker${0}"${2}>${"t3"}</span><span class="option-label${0}"${2}>${"t5"}</span></div></div>`;
const $fragment9 = parseFragment`<div class="coaching-banner slds-box slds-box_small slds-m-bottom_medium${0}" role="alert"${2}><div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="coaching-icon${0}"${2}>💡</span><span class="coaching-title font-weight-bold slds-m-left_x-small${0}"${2}>Architectural Coaching Note</span></div><p class="coaching-text${0}"${2}>${"t7"}</p><p class="coaching-subtext slds-m-top_xx-small${0}"${2}>Review the constraints above and select another architectural pattern.</p></div>`;
const $fragment10 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="success-badge font-weight-bold${0}"${2}>✓ Target Architectural Pattern Validated</span><span class="success-points slds-m-left_small${0}"${2}>${"t4"}</span></div>`;
const $fragment11 = parseFragment`<p class="success-rationale${0}"${2}>${"t1"}</p>`;
const $fragment12 = parseFragment`<a${"a0:href"} target="_blank" rel="noopener noreferrer" class="citation-link slds-m-top_xx-small${0}"${2}>Read official guidance on architect.salesforce.com ↗</a>`;
const $fragment13 = parseFragment`<button type="button" class="slds-button slds-button_brand submit-btn${0}"${"a0:disabled"}${2}>Verify Stage</button>`;
const $fragment14 = parseFragment`<button type="button" class="slds-button slds-button_brand next-stage-btn${0}"${2}>${"t1"}</button>`;
const $fragment15 = parseFragment`<div class="summary-card slds-p-around_large slds-text-align_center${0}"${2}><div class="summary-streak-badge slds-m-bottom_medium${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t4"}</span> Day Streak Achieved!</div><h2 class="slds-text-heading_large font-weight-bold slds-m-bottom_x-small${0}"${2}>Refactoring Masterclass Complete!</h2><p class="slds-text-color_weak slds-m-bottom_large${0}"${2}>You systematically diagnosed root causes, identified decoupled Well-Architected target patterns, governed migration, and established production observability.</p><div class="slds-grid slds-wrap stats-grid slds-m-bottom_large${0}"${2}><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>4/4 Stages</span><span class="stat-label${0}"${2}>Refactor Phases</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t18"}</span><span class="stat-label${0}"${2}>Brier Points</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number stat-quadrant${0}"${2}>${"t23"}</span><span class="stat-label${0}"${2}>Metacognition</span></div></div><button type="button" class="slds-button slds-button_neutral${0}"${2}>Practice Another Refactor Drill</button></div>`;
const stc0 = {
  classMap: {
    "lesson-stepper-container": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "lesson-header": true,
    "slds-m-bottom_medium": true
  },
  key: 1
};
const stc2 = {
  classMap: {
    "stages-wizard": true,
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-m-top_small": true
  },
  key: 8
};
const stc3 = {
  classMap: {
    "inspection-card": true,
    "slds-box": true,
    "slds-box_small": true,
    "slds-theme_shade": true,
    "slds-m-bottom_medium": true
  },
  key: 11
};
const stc4 = {
  classMap: {
    "options-container": true,
    "slds-m-bottom_medium": true
  },
  attrs: {
    "role": "radiogroup",
    "aria-label": "Refactoring Options"
  },
  key: 18
};
const stc5 = {
  classMap: {
    "stage-success-banner": true,
    "slds-box": true,
    "slds-box_small": true,
    "slds-m-bottom_medium": true
  },
  attrs: {
    "role": "alert"
  },
  key: 23
};
const stc6 = {
  classMap: {
    "controls-panel": true,
    "slds-border_top": true,
    "slds-p-top_small": true,
    "slds-m-top_medium": true
  },
  key: 30
};
const stc7 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-wrap": true
  },
  key: 31
};
const stc8 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_2-of-3": true
  },
  key: 32
};
const stc9 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_1-of-3": true,
    "slds-text-align_right": true,
    "slds-m-top_small": true,
    "slds-medium-m-top_none": true
  },
  key: 34
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, sp: api_static_part, st: api_static_fragment, ncls: api_normalize_class_name, k: api_key, i: api_iterator, h: api_element, b: api_bind, c: api_custom_element} = $api;
  const {_m0, _m1, _m2, _m3, _m4, _m5, _m6, _m7} = $ctx;
  return [api_element("div", stc0, [!$cmp.isComplete ? api_element("div", stc1, [api_static_fragment($fragment1, 3, [api_static_part(4, null, "STAGE " + api_dynamic_text($cmp.currentStageNumber) + " OF " + api_dynamic_text($cmp.totalStages))]), api_static_fragment($fragment2, 5, [api_static_part(1, null, api_dynamic_text($cmp.lessonTitle))]), api_static_fragment($fragment3, 7, [api_static_part(1, null, api_dynamic_text($cmp.lessonDomain))]), api_element("div", stc2, api_iterator($cmp.formattedStages, function (stg) {
    return api_static_fragment($fragment4, api_key(10, stg.id), [api_static_part(0, {
      className: api_normalize_class_name(stg.wizardStepClass)
    }, null), api_static_part(2, null, api_dynamic_text(stg.stepNumber)), api_static_part(4, null, api_dynamic_text(stg.title))]);
  }))]) : null, !$cmp.isComplete ? api_element("div", stc3, [api_static_fragment($fragment5, 13, [api_static_part(2, null, api_dynamic_text($cmp.currentStage.stageName)), api_static_part(4, null, api_dynamic_text($cmp.currentStage.focusPillar))]), api_static_fragment($fragment6, 15, [api_static_part(1, null, api_dynamic_text($cmp.currentStage.prompt))]), $cmp.currentStage.codeSnippet ? api_static_fragment($fragment7, 17, [api_static_part(2, null, api_dynamic_text($cmp.currentStage.codeSnippet))]) : null]) : null, !$cmp.isComplete ? api_element("div", stc4, api_iterator($cmp.formattedOptions, function (opt) {
    return api_static_fragment($fragment8, api_key(20, opt.id), [api_static_part(0, {
      on: _m1 || ($ctx._m1 = {
        "click": api_bind($cmp.handleSelectOption),
        "keydown": api_bind($cmp.handleKeyDown)
      }),
      className: api_normalize_class_name(opt.cardClass),
      attrs: {
        "data-id": opt.id,
        "aria-checked": opt.isSelected
      }
    }, null), api_static_part(3, null, api_dynamic_text(opt.letter)), api_static_part(5, null, api_dynamic_text(opt.label))]);
  })) : null, !$cmp.isComplete ? $cmp.showCoachingAlert ? api_static_fragment($fragment9, 22, [api_static_part(7, null, api_dynamic_text($cmp.coachingMessage))]) : null : null, !$cmp.isComplete ? $cmp.isStageSuccess ? api_element("div", stc5, [api_static_fragment($fragment10, 25, [api_static_part(4, null, api_dynamic_text($cmp.stagePointsLabel))]), api_static_fragment($fragment11, 27, [api_static_part(1, null, api_dynamic_text($cmp.currentStage.successRationale))]), $cmp.currentStage.citationUrl ? api_static_fragment($fragment12, 29, [api_static_part(0, {
    attrs: {
      "href": $cmp.currentStage.citationUrl
    }
  }, null)]) : null]) : null : null, !$cmp.isComplete ? api_element("div", stc6, [api_element("div", stc7, [api_element("div", stc8, [api_custom_element("c-confidence-gate", _cConfidenceGate, {
    props: {
      "selectedConfidence": $cmp.selectedConfidence,
      "disabled": $cmp.isStageSuccess
    },
    key: 33,
    on: _m2 || ($ctx._m2 = {
      "confidenceselected": api_bind($cmp.handleConfidenceSelected)
    })
  })]), api_element("div", stc9, [!$cmp.isStageSuccess ? api_static_fragment($fragment13, 36, [api_static_part(0, {
    on: _m4 || ($ctx._m4 = {
      "click": api_bind($cmp.handleSubmitStageDecision)
    }),
    attrs: {
      "disabled": $cmp.isSubmitDisabled ? "" : null
    }
  }, null)]) : null, $cmp.isStageSuccess ? api_static_fragment($fragment14, 38, [api_static_part(0, {
    on: _m6 || ($ctx._m6 = {
      "click": api_bind($cmp.handleNextStage)
    })
  }, null), api_static_part(1, null, api_dynamic_text($cmp.nextStageButtonLabel))]) : null])])]) : null, $cmp.isComplete ? api_static_fragment($fragment15, 40, [api_static_part(4, null, api_dynamic_text($cmp.streakDays)), api_static_part(18, null, api_dynamic_text($cmp.totalBrierPoints)), api_static_part(23, null, api_dynamic_text($cmp.quadrantLabel)), api_static_part(26, {
    on: _m7 || ($ctx._m7 = {
      "click": api_bind($cmp.handleRestart)
    })
  }, null)]) : null])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-1177dolmkj6";
tmpl.legacyStylesheetToken = "c-lessonStepper_lessonStepper";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
