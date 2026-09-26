import _implicitStylesheets from "./dualMeterScenario.css";
import _implicitScopedStylesheets from "./dualMeterScenario.scoped.css?scoped=true";
import _cConfidenceGate from "c/confidenceGate";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="scenario-header slds-m-bottom_medium${0}"${2}><div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="drill-tag slds-badge slds-theme_warning${0}"${2}>SCENARIO DRILL</span><span class="step-counter font-weight-bold${0}"${2}>${"t5"}</span></div><h2 class="slds-text-heading_medium font-weight-bold slds-m-bottom_x-small${0}"${2}>${"t7"}</h2><p class="slds-text-body_small slds-text-color_weak${0}"${2}>${"t9"}</p></div>`;
const $fragment2 = parseFragment`<div class="meters-dashboard slds-box slds-box_small slds-theme_shade slds-m-bottom_medium${0}"${2}><div class="slds-grid slds-wrap meters-grid${0}"${2}><div class="slds-size_1-of-1 slds-medium-size_1-of-2 slds-p-horizontal_x-small meter-column${0}"${2}><div class="slds-grid slds-grid_align-spread slds-m-bottom_xx-small${0}"${2}><span class="meter-label font-weight-bold${0}"${2}>🤝 Stakeholder Trust</span><span class="meter-score font-weight-bold${0}"${2}>${"t7"}</span></div><div class="meter-track${0}" role="progressbar" aria-valuemin="0" aria-valuemax="100"${"a8:aria-valuenow"}${2}><div class="meter-fill meter-fill_trust${0}"${"s9"}${2}></div></div><span class="meter-status-note${0}"${2}>${"t11"}</span></div><div class="slds-size_1-of-1 slds-medium-size_1-of-2 slds-p-horizontal_x-small meter-column slds-m-top_small slds-medium-m-top_none${0}"${2}><div class="slds-grid slds-grid_align-spread slds-m-bottom_xx-small${0}"${2}><span class="meter-label font-weight-bold${0}"${2}>🛡️ Well-Architected Integrity</span><span class="meter-score font-weight-bold${0}"${2}>${"t17"}</span></div><div class="meter-track${0}" role="progressbar" aria-valuemin="0" aria-valuemax="100"${"a18:aria-valuenow"}${2}><div class="meter-fill meter-fill_integrity${0}"${"s19"}${2}></div></div><span class="meter-status-note${0}"${2}>${"t21"}</span></div></div></div>`;
const $fragment3 = parseFragment`<div class="persona-dialogue-card slds-box slds-box_small slds-m-bottom_medium${0}"${2}><div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_x-small${0}"${2}><span class="persona-avatar slds-m-right_small${0}"${2}>${"t3"}</span><div${3}><span class="persona-name font-weight-bold${0}"${2}>${"t6"}</span><span class="persona-title slds-m-left_x-small slds-text-color_weak${0}"${2}>${"t8"}</span></div></div><div class="speech-bubble${0}"${2}><p class="dialogue-text${0}"${2}>${"t11"}</p></div></div>`;
const $fragment4 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="stance-marker${0}"${2}>${"t2"}</span><span class="stance-label font-weight-bold${0}"${2}>${"t4"}</span></div>`;
const $fragment5 = parseFragment`<div class="stance-deltas slds-m-top_xx-small${0}"${2}><span${"c1"}${2}>${"t2"}</span><span${"c3"}${2}>${"t4"}</span></div>`;
const $fragment6 = parseFragment`<div${"c0"} role="alert"${2}><div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="feedback-badge${0}"${2}>${"t3"}</span><span class="feedback-points slds-m-left_small${0}"${2}>${"t5"}</span></div><p class="stakeholder-reaction slds-m-bottom_xx-small${0}"${2}><span class="font-weight-bold${0}"${2}>${"t8"}</span>${"t9"}</p><p class="feedback-rationale${0}"${2}>${"t11"}</p></div>`;
const $fragment7 = parseFragment`<button type="button" class="slds-button slds-button_brand commit-btn${0}"${"a0:disabled"}${2}>Commit Stance</button>`;
const $fragment8 = parseFragment`<button type="button" class="slds-button slds-button_brand next-btn${0}"${2}>${"t1"}</button>`;
const $fragment9 = parseFragment`<div class="summary-card slds-p-around_large${0}"${2}><div class="slds-text-align_center slds-m-bottom_medium${0}"${2}><div class="summary-streak-badge slds-m-bottom_x-small${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t5"}</span> Day Streak Achieved!</div><h2 class="slds-text-heading_large font-weight-bold${0}"${2}>Scenario Debrief &amp; Hangover Report</h2></div><div class="final-meters-box slds-box slds-theme_shade slds-m-bottom_medium${0}"${2}><div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center${0}"${2}><div class="slds-text-align_center slds-size_1-of-2 slds-border_right slds-p-around_small${0}"${2}><span class="final-meter-label${0}"${2}>Final Stakeholder Trust</span><span class="final-meter-value font-weight-bold${0}"${2}>${"t15"}</span></div><div class="slds-text-align_center slds-size_1-of-2 slds-p-around_small${0}"${2}><span class="final-meter-label${0}"${2}>Final Platform Integrity</span><span class="final-meter-value font-weight-bold${0}"${2}>${"t20"}</span></div></div></div><div${"c21"}${2}><div class="slds-grid slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><span class="hangover-badge font-weight-bold${0}"${2}>${"t24"}</span></div><p class="hangover-timeline font-weight-bold slds-m-bottom_xx-small${0}"${2}>🗓️ 6 to 12 Months Post-Deployment:</p><p class="hangover-body${0}"${2}>${"t28"}</p></div><div class="slds-grid slds-wrap stats-grid slds-m-bottom_large${0}"${2}><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t32"}</span><span class="stat-label${0}"${2}>Well-Architected Moves</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number${0}"${2}>${"t37"}</span><span class="stat-label${0}"${2}>Brier Points</span></div><div class="stat-box slds-size_1-of-3${0}"${2}><span class="stat-number stat-quadrant${0}"${2}>${"t42"}</span><span class="stat-label${0}"${2}>Metacognition</span></div></div><div class="slds-text-align_center${0}"${2}><button type="button" class="slds-button slds-button_neutral${0}"${2}>Re-Negotiate Scenario</button></div></div>`;
const stc0 = {
  classMap: {
    "scenario-runner-container": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "stances-container": true,
    "slds-m-bottom_medium": true
  },
  attrs: {
    "role": "radiogroup",
    "aria-label": "Architectural Stances"
  },
  key: 7
};
const stc2 = {
  classMap: {
    "controls-panel": true,
    "slds-border_top": true,
    "slds-p-top_small": true,
    "slds-m-top_medium": true
  },
  key: 15
};
const stc3 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-wrap": true
  },
  key: 16
};
const stc4 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_2-of-3": true
  },
  key: 17
};
const stc5 = {
  classMap: {
    "slds-size_1-of-1": true,
    "slds-medium-size_1-of-3": true,
    "slds-text-align_right": true,
    "slds-m-top_small": true,
    "slds-medium-m-top_none": true
  },
  key: 19
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, sp: api_static_part, st: api_static_fragment, ncls: api_normalize_class_name, k: api_key, b: api_bind, h: api_element, i: api_iterator, c: api_custom_element} = $api;
  const {_m0, _m1, _m2, _m3, _m4, _m5, _m6} = $ctx;
  return [api_element("div", stc0, [!$cmp.isComplete ? api_static_fragment($fragment1, 2, [api_static_part(5, null, "MOVE " + api_dynamic_text($cmp.currentMoveNumber) + " OF " + api_dynamic_text($cmp.totalMoves)), api_static_part(7, null, api_dynamic_text($cmp.drillTitle)), api_static_part(9, null, api_dynamic_text($cmp.drillDomain))]) : null, !$cmp.isComplete ? api_static_fragment($fragment2, 4, [api_static_part(7, null, api_dynamic_text($cmp.trustScore) + "/100"), api_static_part(8, {
    attrs: {
      "aria-valuenow": $cmp.trustScore
    }
  }, null), api_static_part(9, {
    style: $cmp.trustBarStyle
  }, null), api_static_part(11, null, api_dynamic_text($cmp.trustStatusNote)), api_static_part(17, null, api_dynamic_text($cmp.integrityScore) + "/100"), api_static_part(18, {
    attrs: {
      "aria-valuenow": $cmp.integrityScore
    }
  }, null), api_static_part(19, {
    style: $cmp.integrityBarStyle
  }, null), api_static_part(21, null, api_dynamic_text($cmp.integrityStatusNote))]) : null, !$cmp.isComplete ? api_static_fragment($fragment3, 6, [api_static_part(3, null, api_dynamic_text($cmp.personaAvatar)), api_static_part(6, null, api_dynamic_text($cmp.personaName)), api_static_part(8, null, api_dynamic_text($cmp.personaRole)), api_static_part(11, null, "\"" + api_dynamic_text($cmp.currentMove.stakeholderDialogue) + "\"")]) : null, !$cmp.isComplete ? api_element("div", stc1, api_iterator($cmp.formattedStances, function (stance) {
    return api_element("div", {
      className: api_normalize_class_name(stance.cardClass),
      attrs: {
        "data-id": stance.id,
        "role": "radio",
        "aria-checked": stance.isSelected,
        "tabindex": "0"
      },
      key: api_key(8, stance.id),
      on: _m0 || ($ctx._m0 = {
        "click": api_bind($cmp.handleSelectStance),
        "keydown": api_bind($cmp.handleKeyDown)
      })
    }, [api_static_fragment($fragment4, 10, [api_static_part(2, null, api_dynamic_text(stance.letter)), api_static_part(4, null, api_dynamic_text(stance.label))]), $cmp.isMoveAnswered ? api_static_fragment($fragment5, 12, [api_static_part(1, {
      className: api_normalize_class_name(stance.trustDeltaClass)
    }, null), api_static_part(2, null, "Trust: " + api_dynamic_text(stance.trustDeltaText)), api_static_part(3, {
      className: api_normalize_class_name(stance.integrityDeltaClass)
    }, null), api_static_part(4, null, "Integrity: " + api_dynamic_text(stance.integrityDeltaText))]) : null]);
  })) : null, !$cmp.isComplete ? $cmp.isMoveAnswered ? api_static_fragment($fragment6, 14, [api_static_part(0, {
    className: api_normalize_class_name($cmp.moveFeedbackClass)
  }, null), api_static_part(3, null, api_dynamic_text($cmp.moveFeedbackTitle)), api_static_part(5, null, api_dynamic_text($cmp.movePointsLabel)), api_static_part(8, null, api_dynamic_text($cmp.personaName) + "'s Reaction:"), api_static_part(9, null, " \"" + api_dynamic_text($cmp.lastReactionText) + "\""), api_static_part(11, null, api_dynamic_text($cmp.lastRationaleText))]) : null : null, !$cmp.isComplete ? api_element("div", stc2, [api_element("div", stc3, [api_element("div", stc4, [api_custom_element("c-confidence-gate", _cConfidenceGate, {
    props: {
      "selectedConfidence": $cmp.selectedConfidence,
      "disabled": $cmp.isMoveAnswered
    },
    key: 18,
    on: _m1 || ($ctx._m1 = {
      "confidenceselected": api_bind($cmp.handleConfidenceSelected)
    })
  })]), api_element("div", stc5, [!$cmp.isMoveAnswered ? api_static_fragment($fragment7, 21, [api_static_part(0, {
    on: _m3 || ($ctx._m3 = {
      "click": api_bind($cmp.handleCommitStance)
    }),
    attrs: {
      "disabled": $cmp.isCommitDisabled ? "" : null
    }
  }, null)]) : null, $cmp.isMoveAnswered ? api_static_fragment($fragment8, 23, [api_static_part(0, {
    on: _m5 || ($ctx._m5 = {
      "click": api_bind($cmp.handleNextMove)
    })
  }, null), api_static_part(1, null, api_dynamic_text($cmp.nextButtonLabel))]) : null])])]) : null, $cmp.isComplete ? api_static_fragment($fragment9, 25, [api_static_part(5, null, api_dynamic_text($cmp.streakDays)), api_static_part(15, null, api_dynamic_text($cmp.trustScore) + "/100"), api_static_part(20, null, api_dynamic_text($cmp.integrityScore) + "/100"), api_static_part(21, {
    className: api_normalize_class_name($cmp.hangoverCardClass)
  }, null), api_static_part(24, null, api_dynamic_text($cmp.hangoverTitle)), api_static_part(28, null, api_dynamic_text($cmp.hangoverDescription)), api_static_part(32, null, api_dynamic_text($cmp.correctCount) + "/" + api_dynamic_text($cmp.totalMoves)), api_static_part(37, null, api_dynamic_text($cmp.totalBrierPoints)), api_static_part(42, null, api_dynamic_text($cmp.quadrantLabel)), api_static_part(46, {
    on: _m6 || ($ctx._m6 = {
      "click": api_bind($cmp.handleRestart)
    })
  }, null)]) : null])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-3ojlnhrto19";
tmpl.legacyStylesheetToken = "c-dualMeterScenario_dualMeterScenario";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
