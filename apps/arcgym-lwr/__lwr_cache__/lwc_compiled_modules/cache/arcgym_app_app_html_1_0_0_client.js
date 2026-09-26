import _implicitStylesheets from "./app.css";
import _implicitScopedStylesheets from "./app.scoped.css?scoped=true";
import _cConfidenceGate from "c/confidenceGate";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<header class="slds-global-header_container${0}"${2}><div class="slds-global-header slds-grid slds-grid_align-spread slds-p-horizontal_medium slds-p-vertical_x-small arcgym-nav${0}"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="arcgym-logo slds-m-right_small${0}"${2}>AG</span><div${3}><span class="slds-text-heading_small slds-text-color_inverse font-weight-bold${0}"${2}>Arc<span class="arcgym-logo-accent${0}"${2}>Gym</span></span><span class="slds-badge slds-badge_lightest slds-m-left_small${0}"${2}>Salesforce Architect Edition</span></div></div><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="arcgym-streak-pill slds-m-right_small${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t16"}</span> Day Streak</span><button class="slds-button slds-button_neutral slds-button_stateful slds-not-selected${0}"${2}>${"t19"}</button></div></div></header>`;
const $fragment2 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="slds-badge slds-theme_success slds-m-right_x-small${0}"${2}>TODAY&#x27;S DRILL</span><span class="slds-text-title_caps slds-text-color_weak${0}"${2}>${"t4"}</span></div>`;
const $fragment3 = parseFragment`<span class="slds-badge slds-badge_inverse slds-m-left_xx-small${0}"${2}>${"t1"}</span>`;
const $fragment4 = parseFragment`<h1 class="slds-text-heading_medium slds-m-bottom_small${0}"${2}>${"t1"}</h1>`;
const $fragment5 = parseFragment`<p class="slds-text-body_regular slds-text-color_weak slds-m-bottom_large arcgym-prompt${0}"${2}>${"t1"}</p>`;
const $fragment6 = parseFragment`<div class="arcgym-format-pills slds-m-bottom_large slds-grid slds-grid_align-center${0}"${2}><span class="format-pill format-pill-active${0}"${2}>Rapid Fire (6 Decisions)</span><span class="format-pill${0}"${2}>Lesson</span><span class="format-pill${0}"${2}>Currency</span><span class="format-pill${0}"${2}>Scenario</span></div>`;
const $fragment7 = parseFragment`<div class="arcgym-practice-box slds-box slds-box_small slds-theme_shade slds-m-bottom_large${0}"${2}><div class="slds-grid slds-grid_vertical-align-center slds-grid_align-spread${0}"${2}><div${3}><span class="slds-text-heading_small${0}"${2}>Decision 1 of 6: Decoupled Asynchronous Ingestion</span><p class="slds-text-body_small slds-text-color_weak slds-m-top_xx-small${0}"${2}>Incoming order volume peaks at 120k records/hour. External ERP expects immediate acknowledgment with correlation ID. Which pattern adheres to Well-Architected Reliability?</p></div></div><div class="slds-m-top_medium${0}"${2}><div class="arcgym-option-card${0}"${2}><span class="font-weight-bold${0}"${2}>A.</span> High-Volume Platform Event + CometD/Pub-Sub Replay bus with immediate 202 Accepted</div><div class="arcgym-option-card${0}"${2}><span class="font-weight-bold${0}"${2}>B.</span> Synchronous REST Apex Webhook with direct insert and rollback on error</div><div class="arcgym-option-card${0}"${2}><span class="font-weight-bold${0}"${2}>C.</span> Inbound Zero Copy Query Federation polling external ERP every 15 seconds</div></div></div>`;
const $fragment8 = parseFragment`<div class="slds-size_1-of-3 slds-text-align_right${0}"${2}><button class="slds-button slds-button_brand slds-m-top_small arcgym-submit-btn${0}"${"a1:disabled"}${2}>Commit Decision</button></div>`;
const $fragment9 = parseFragment`<footer class="arcgym-footer slds-text-align_center slds-m-top_large${0}"${2}><p class="slds-text-body_small slds-text-color_weak${0}"${2}>ArcGym practice is strictly grounded in official patterns from<a href="https://architect.salesforce.com" target="_blank" rel="noopener noreferrer" class="slds-text-link${0}"${2}>architect.salesforce.com</a>.</p><p class="slds-text-body_small slds-text-color_weak slds-m-top_xx-small${0}"${2}>© ArcGym. Built with open-source Lightning Web Components &amp; LWR.</p></footer>`;
const stc0 = {
  classMap: {
    "arcgym-container": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "arcgym-main": true,
    "slds-p-around_medium": true
  },
  key: 3
};
const stc2 = {
  classMap: {
    "arcgym-card": true,
    "slds-card": true,
    "slds-p-around_large": true,
    "slds-shadow_medium": true
  },
  key: 4
};
const stc3 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-m-bottom_medium": true
  },
  key: 5
};
const stc4 = {
  key: 8
};
const stc5 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-grid_vertical-align-center": true,
    "slds-p-top_small": true,
    "slds-border_top": true
  },
  key: 19
};
const stc6 = {
  classMap: {
    "slds-size_2-of-3": true
  },
  key: 20
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, b: api_bind, sp: api_static_part, st: api_static_fragment, k: api_key, i: api_iterator, h: api_element, c: api_custom_element} = $api;
  const {_m0, _m1, _m2} = $ctx;
  return [api_element("div", stc0, [api_static_fragment($fragment1, 2, [api_static_part(16, null, api_dynamic_text($cmp.streakDays)), api_static_part(18, {
    on: _m0 || ($ctx._m0 = {
      "click": api_bind($cmp.handleAuthClick)
    })
  }, null), api_static_part(19, null, api_dynamic_text($cmp.authButtonLabel))]), api_element("main", stc1, [api_element("div", stc2, [api_element("div", stc3, [api_static_fragment($fragment2, 7, [api_static_part(4, null, api_dynamic_text($cmp.todayDrill.format) + " • " + api_dynamic_text($cmp.todayDrill.domain))]), api_element("div", stc4, api_iterator($cmp.todayDrill.pillars, function (pillar) {
    return api_static_fragment($fragment3, api_key(10, pillar), [api_static_part(1, null, api_dynamic_text(pillar))]);
  }))]), api_static_fragment($fragment4, 12, [api_static_part(1, null, api_dynamic_text($cmp.todayDrill.title))]), api_static_fragment($fragment5, 14, [api_static_part(1, null, api_dynamic_text($cmp.todayDrill.prompt))]), api_static_fragment($fragment6, 16), api_static_fragment($fragment7, 18), api_element("div", stc5, [api_element("div", stc6, [api_custom_element("c-confidence-gate", _cConfidenceGate, {
    props: {
      "selectedConfidence": $cmp.selectedConfidence
    },
    key: 21,
    on: _m1 || ($ctx._m1 = {
      "confidenceselected": api_bind($cmp.handleConfidenceSelected)
    })
  })]), api_static_fragment($fragment8, 23, [api_static_part(1, {
    on: _m2 || ($ctx._m2 = {
      "click": api_bind($cmp.handleSubmitDecision)
    }),
    attrs: {
      "disabled": $cmp.isSubmitDisabled ? "" : null
    }
  }, null)])])]), api_static_fragment($fragment9, 25)])])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-66iql6giv5n";
tmpl.legacyStylesheetToken = "arcgym-app_app";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
