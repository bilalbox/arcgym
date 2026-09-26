import _implicitStylesheets from "./rapidFireRunner.css";
import _implicitScopedStylesheets from "./rapidFireRunner.scoped.css?scoped=true";
import _cRapidFireCard from "c/rapidFireCard";
import _cConfidenceGate from "c/confidenceGate";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_small${0}"${2}><div${3}><span class="step-indicator${0}"${2}>${"t3"}</span></div><div class="progress-bar-container${0}"${2}><div class="progress-bar-fill${0}"${"s5"}${2}></div></div></div>`;
const $fragment2 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="feedback-badge${0}"${2}>${"t2"}</span><span class="feedback-points slds-m-left_small${0}"${2}>${"t4"}</span></div>`;
const $fragment3 = parseFragment`<p class="feedback-rationale${0}"${2}>${"t1"}</p>`;
const $fragment4 = parseFragment`<a${"a0:href"} target="_blank" rel="noopener noreferrer" class="feedback-link slds-m-top_xx-small${0}"${2}>Read official guidance on architect.salesforce.com ↗</a>`;
const $fragment5 = parseFragment`<button type="button" class="slds-button slds-button_brand commit-btn${0}"${"a0:disabled"}${2}>Commit Decision</button>`;
const $fragment6 = parseFragment`<button type="button" class="slds-button slds-button_brand next-btn${0}"${2}>${"t1"}</button>`;
const $fragment7 = parseFragment`<div class="summary-card slds-p-around_large slds-text-align_center${0}"${2}><div class="summary-streak-badge slds-m-bottom_medium${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t4"}</span> Day Streak Achieved!</div><h2 class="slds-text-heading_large font-weight-bold slds-m-bottom_x-small${0}"${2}>Drill Complete!</h2><p class="slds-text-color_weak slds-m-bottom_large${0}"${2}>Showing up is a win. You just practiced high-stakes Salesforce architectural judgment.</p><div class="slds-grid slds-wrap stats-grid slds-m-bottom_large${0}"${2}><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t13"}</span><span class="stat-label${0}"${2}>Accuracy</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t18"}</span><span class="stat-label${0}"${2}>Brier Points</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number stat-quadrant${0}"${2}>${"t23"}</span><span class="stat-label${0}"${2}>Metacognition</span></div></div><button type="button" class="slds-button slds-button_neutral${0}"${2}>Practice Another Drill</button></div>`;
const stc0 = {
  classMap: {
    "runner-container": true
  },
  key: 0
};
const stc1 = {
  "role": "alert"
};
const stc2 = {
  classMap: {
    "controls-container": true,
    "slds-border_top": true,
    "slds-p-top_small": true,
    "slds-m-top_medium": true
  },
  key: 11
};
const stc3 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-wrap": true
  },
  key: 12
};
const stc4 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_2-of-3": true
  },
  key: 13
};
const stc5 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_1-of-3": true,
    "slds-text-align_right": true,
    "slds-m-top_small": true,
    "slds-medium-m-top_none": true
  },
  key: 15
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, sp: api_static_part, st: api_static_fragment, b: api_bind, c: api_custom_element, ncls: api_normalize_class_name, h: api_element} = $api;
  const {_m0, _m1, _m2, _m3, _m4, _m5, _m6} = $ctx;
  return [api_element("div", stc0, [!$cmp.isComplete ? api_static_fragment($fragment1, 2, [api_static_part(3, null, "DECISION " + api_dynamic_text($cmp.currentStepNumber) + " OF " + api_dynamic_text($cmp.totalSteps)), api_static_part(5, {
    style: $cmp.progressBarStyle
  }, null)]) : null, !$cmp.isComplete ? api_custom_element("c-rapid-fire-card", _cRapidFireCard, {
    props: {
      "prompt": $cmp.currentStep.prompt,
      "options": $cmp.currentStep.options,
      "selectedOptionId": $cmp.selectedOptionId,
      "isAnswered": $cmp.isAnswered
    },
    key: 3,
    on: _m0 || ($ctx._m0 = {
      "optionselect": api_bind($cmp.handleOptionSelected)
    })
  }) : null, !$cmp.isComplete ? $cmp.isAnswered ? api_element("div", {
    className: api_normalize_class_name($cmp.feedbackBannerClass),
    attrs: stc1,
    key: 4
  }, [api_static_fragment($fragment2, 6, [api_static_part(2, null, api_dynamic_text($cmp.feedbackTitle)), api_static_part(4, null, api_dynamic_text($cmp.lastBrierPointsLabel))]), api_static_fragment($fragment3, 8, [api_static_part(1, null, api_dynamic_text($cmp.currentStepRationale))]), $cmp.currentStepCitation ? api_static_fragment($fragment4, 10, [api_static_part(0, {
    attrs: {
      "href": $cmp.currentStepCitation
    }
  }, null)]) : null]) : null : null, !$cmp.isComplete ? api_element("div", stc2, [api_element("div", stc3, [api_element("div", stc4, [api_custom_element("c-confidence-gate", _cConfidenceGate, {
    props: {
      "selectedConfidence": $cmp.selectedConfidence,
      "disabled": $cmp.isAnswered
    },
    key: 14,
    on: _m1 || ($ctx._m1 = {
      "confidenceselected": api_bind($cmp.handleConfidenceSelected)
    })
  })]), api_element("div", stc5, [!$cmp.isAnswered ? api_static_fragment($fragment5, 17, [api_static_part(0, {
    on: _m3 || ($ctx._m3 = {
      "click": api_bind($cmp.handleCommitDecision)
    }),
    attrs: {
      "disabled": $cmp.isCommitDisabled ? "" : null
    }
  }, null)]) : null, $cmp.isAnswered ? api_static_fragment($fragment6, 19, [api_static_part(0, {
    on: _m5 || ($ctx._m5 = {
      "click": api_bind($cmp.handleNextStep)
    })
  }, null), api_static_part(1, null, api_dynamic_text($cmp.nextButtonLabel))]) : null])])]) : null, $cmp.isComplete ? api_static_fragment($fragment7, 21, [api_static_part(4, null, api_dynamic_text($cmp.streakDays)), api_static_part(13, null, api_dynamic_text($cmp.correctCount) + "/" + api_dynamic_text($cmp.totalSteps)), api_static_part(18, null, api_dynamic_text($cmp.totalBrierPoints)), api_static_part(23, null, api_dynamic_text($cmp.quadrantLabel)), api_static_part(26, {
    on: _m6 || ($ctx._m6 = {
      "click": api_bind($cmp.handleRestart)
    })
  }, null)]) : null])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-7er6ija2sha";
tmpl.legacyStylesheetToken = "c-rapidFireRunner_rapidFireRunner";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
