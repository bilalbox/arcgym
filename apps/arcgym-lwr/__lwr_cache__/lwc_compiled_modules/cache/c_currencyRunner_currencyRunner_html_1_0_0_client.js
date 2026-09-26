import _implicitStylesheets from "./currencyRunner.css";
import _implicitScopedStylesheets from "./currencyRunner.scoped.css?scoped=true";
import _cBudgetMeter from "c/budgetMeter";
import _cConfidenceGate from "c/confidenceGate";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="scenario-header slds-m-bottom_medium${0}"${2}><div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="drill-tag slds-badge slds-theme_inverse${0}"${2}>CURRENCY DRILL</span><span class="slds-text-body_small slds-text-color_weak${0}"${2}>${"t5"}</span></div><h2 class="slds-text-heading_medium font-weight-bold slds-m-bottom_x-small${0}"${2}>${"t7"}</h2><p class="scenario-prompt slds-text-color_weak${0}"${2}>${"t9"}</p></div>`;
const $fragment2 = parseFragment`<div class="category-header slds-m-bottom_small${0}"${2}><h3 class="category-title font-weight-bold${0}"${2}>${"t2"}</h3><p class="category-description slds-text-body_small slds-text-color_weak${0}"${2}>${"t4"}</p></div>`;
const $fragment3 = parseFragment`<div${"c0"}${"a0:data-category-id"}${"a0:data-option-id"} role="radio"${"a0:aria-checked"} tabindex="0"${2}><div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="option-marker${0}"${2}>${"t4"}</span><span class="option-name font-weight-bold${0}"${2}>${"t6"}</span></div><span${"c7"}${2}>${"t8"}</span></div><p class="option-details${0}"${2}>${"t10"}</p></div>`;
const $fragment4 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="feedback-badge${0}"${2}>${"t2"}</span><span class="feedback-points slds-m-left_small${0}"${2}>${"t4"}</span></div>`;
const $fragment5 = parseFragment`<p class="feedback-rationale${0}"${2}>${"t1"}</p>`;
const $fragment6 = parseFragment`<a${"a0:href"} target="_blank" rel="noopener noreferrer" class="feedback-link slds-m-top_xx-small${0}"${2}>Read Governor &amp; Scalability Guidance on architect.salesforce.com ↗</a>`;
const $fragment7 = parseFragment`<button type="button" class="slds-button slds-button_brand commit-btn${0}"${"a0:disabled"}${2}>Commit Architecture</button>`;
const $fragment8 = parseFragment`<button type="button" class="slds-button slds-button_brand finish-btn${0}"${2}>View Calibration Summary</button>`;
const $fragment9 = parseFragment`<div class="summary-card slds-p-around_large slds-text-align_center${0}"${2}><div class="summary-streak-badge slds-m-bottom_medium${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t4"}</span> Day Streak Achieved!</div><h2 class="slds-text-heading_large font-weight-bold slds-m-bottom_x-small${0}"${2}>Architecture Committed!</h2><p class="slds-text-color_weak slds-m-bottom_large${0}"${2}>Resource discipline is the hallmark of a Lead Salesforce Architect.</p><div class="slds-grid slds-wrap stats-grid slds-m-bottom_large${0}"${2}><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t13"}</span><span class="stat-label${0}"${2}>Budget Used</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t18"}</span><span class="stat-label${0}"${2}>Brier Points</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number stat-quadrant${0}"${2}>${"t23"}</span><span class="stat-label${0}"${2}>Metacognition</span></div></div><button type="button" class="slds-button slds-button_neutral${0}"${2}>Re-Architect Drill</button></div>`;
const stc0 = {
  classMap: {
    "currency-runner-container": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "meter-sticky-wrapper": true,
    "slds-m-bottom_large": true
  },
  key: 3
};
const stc2 = {
  classMap: {
    "categories-container": true,
    "slds-m-bottom_large": true
  },
  key: 5
};
const stc3 = {
  "category-card": true,
  "slds-box": true,
  "slds-box_small": true,
  "slds-m-bottom_medium": true
};
const stc4 = {
  "options-grid": true
};
const stc5 = {
  "role": "alert"
};
const stc6 = {
  classMap: {
    "controls-panel": true,
    "slds-border_top": true,
    "slds-p-top_small": true,
    "slds-m-top_medium": true
  },
  key: 19
};
const stc7 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-wrap": true
  },
  key: 20
};
const stc8 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_2-of-3": true
  },
  key: 21
};
const stc9 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_1-of-3": true,
    "slds-text-align_right": true,
    "slds-m-top_small": true,
    "slds-medium-m-top_none": true
  },
  key: 23
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, sp: api_static_part, st: api_static_fragment, c: api_custom_element, h: api_element, k: api_key, ncls: api_normalize_class_name, b: api_bind, i: api_iterator} = $api;
  const {_m0, _m1, _m2, _m3, _m4, _m5, _m6, _m7} = $ctx;
  return [api_element("div", stc0, [!$cmp.isComplete ? api_static_fragment($fragment1, 2, [api_static_part(5, null, api_dynamic_text($cmp.drillDomain)), api_static_part(7, null, api_dynamic_text($cmp.drillTitle)), api_static_part(9, null, api_dynamic_text($cmp.scenarioPrompt))]) : null, !$cmp.isComplete ? api_element("div", stc1, [api_custom_element("c-budget-meter", _cBudgetMeter, {
    props: {
      "totalBudget": $cmp.totalBudget,
      "usedBudget": $cmp.totalAllocatedCost,
      "unitLabel": $cmp.unitLabel,
      "title": $cmp.budgetTitle
    },
    key: 4
  })]) : null, !$cmp.isComplete ? api_element("div", stc2, api_iterator($cmp.formattedCategories, function (cat) {
    return api_element("div", {
      classMap: stc3,
      key: api_key(6, cat.id)
    }, [api_static_fragment($fragment2, 8, [api_static_part(2, null, api_dynamic_text(cat.title)), api_static_part(4, null, api_dynamic_text(cat.description))]), api_element("div", {
      classMap: stc4,
      attrs: {
        "role": "radiogroup",
        "aria-label": cat.title
      },
      key: 9
    }, api_iterator(cat.options, function (opt) {
      return api_static_fragment($fragment3, api_key(11, opt.id), [api_static_part(0, {
        on: _m1 || ($ctx._m1 = {
          "click": api_bind($cmp.handleSelectOption),
          "keydown": api_bind($cmp.handleKeyDown)
        }),
        className: api_normalize_class_name(opt.cardClass),
        attrs: {
          "data-category-id": cat.id,
          "data-option-id": opt.id,
          "aria-checked": opt.isSelected
        }
      }, null), api_static_part(4, null, api_dynamic_text(opt.letter)), api_static_part(6, null, api_dynamic_text(opt.name)), api_static_part(7, {
        className: api_normalize_class_name(opt.costBadgeClass)
      }, null), api_static_part(8, null, api_dynamic_text(opt.cost) + " " + api_dynamic_text($cmp.unitLabel)), api_static_part(10, null, api_dynamic_text(opt.details))]);
    }))]);
  })) : null, !$cmp.isComplete ? $cmp.isAnswered ? api_element("div", {
    className: api_normalize_class_name($cmp.feedbackClass),
    attrs: stc5,
    key: 12
  }, [api_static_fragment($fragment4, 14, [api_static_part(2, null, api_dynamic_text($cmp.feedbackTitle)), api_static_part(4, null, api_dynamic_text($cmp.brierPointsLabel))]), api_static_fragment($fragment5, 16, [api_static_part(1, null, api_dynamic_text($cmp.evaluationRationale))]), $cmp.citationUrl ? api_static_fragment($fragment6, 18, [api_static_part(0, {
    attrs: {
      "href": $cmp.citationUrl
    }
  }, null)]) : null]) : null : null, !$cmp.isComplete ? api_element("div", stc6, [api_element("div", stc7, [api_element("div", stc8, [api_custom_element("c-confidence-gate", _cConfidenceGate, {
    props: {
      "selectedConfidence": $cmp.selectedConfidence,
      "disabled": $cmp.isAnswered
    },
    key: 22,
    on: _m2 || ($ctx._m2 = {
      "confidenceselected": api_bind($cmp.handleConfidenceSelected)
    })
  })]), api_element("div", stc9, [!$cmp.isAnswered ? api_static_fragment($fragment7, 25, [api_static_part(0, {
    on: _m4 || ($ctx._m4 = {
      "click": api_bind($cmp.handleCommitConfiguration)
    }),
    attrs: {
      "disabled": $cmp.isCommitDisabled ? "" : null
    }
  }, null)]) : null, $cmp.isAnswered ? api_static_fragment($fragment8, 27, [api_static_part(0, {
    on: _m6 || ($ctx._m6 = {
      "click": api_bind($cmp.handleFinishDrill)
    })
  }, null)]) : null])])]) : null, $cmp.isComplete ? api_static_fragment($fragment9, 29, [api_static_part(4, null, api_dynamic_text($cmp.streakDays)), api_static_part(13, null, api_dynamic_text($cmp.totalAllocatedCost) + "/" + api_dynamic_text($cmp.totalBudget)), api_static_part(18, null, api_dynamic_text($cmp.earnedPoints)), api_static_part(23, null, api_dynamic_text($cmp.quadrantLabel)), api_static_part(26, {
    on: _m7 || ($ctx._m7 = {
      "click": api_bind($cmp.handleRestart)
    })
  }, null)]) : null])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-2pivh3ppihp";
tmpl.legacyStylesheetToken = "c-currencyRunner_currencyRunner";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
