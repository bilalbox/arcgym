import _implicitStylesheets from "./app.css";
import _implicitScopedStylesheets from "./app.scoped.css?scoped=true";
import _cRapidFireRunner from "c/rapidFireRunner";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<header class="slds-global-header_container${0}"${2}><div class="slds-global-header slds-grid slds-grid_align-spread slds-p-horizontal_medium slds-p-vertical_x-small arcgym-nav${0}"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="arcgym-logo slds-m-right_small${0}"${2}>AG</span><div${3}><span class="slds-text-heading_small slds-text-color_inverse font-weight-bold${0}"${2}>Arc<span class="arcgym-logo-accent${0}"${2}>Gym</span></span><span class="slds-badge slds-badge_lightest slds-m-left_small${0}"${2}>Salesforce Architect Edition</span></div></div><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="arcgym-streak-pill slds-m-right_small${0}"${2}>🔥 <span class="font-weight-bold${0}"${2}>${"t16"}</span> Day Streak</span><button class="slds-button slds-button_neutral slds-button_stateful slds-not-selected${0}"${2}>${"t19"}</button></div></div></header>`;
const $fragment2 = parseFragment`<div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="slds-badge slds-theme_success slds-m-right_x-small${0}"${2}>TODAY&#x27;S DRILL</span><span class="slds-text-title_caps slds-text-color_weak${0}"${2}>${"t4"}</span></div>`;
const $fragment3 = parseFragment`<span class="slds-badge slds-badge_inverse slds-m-left_xx-small${0}"${2}>${"t1"}</span>`;
const $fragment4 = parseFragment`<h1 class="slds-text-heading_medium slds-m-bottom_small${0}"${2}>${"t1"}</h1>`;
const $fragment5 = parseFragment`<p class="slds-text-body_regular slds-text-color_weak slds-m-bottom_large arcgym-prompt${0}"${2}>${"t1"}</p>`;
const $fragment6 = parseFragment`<div class="arcgym-format-pills slds-m-bottom_large slds-grid slds-grid_align-center${0}"${2}><span class="format-pill format-pill-active${0}"${2}>Rapid Fire (6 Decisions)</span><span class="format-pill${0}"${2}>Lesson</span><span class="format-pill${0}"${2}>Currency</span><span class="format-pill${0}"${2}>Scenario</span></div>`;
const $fragment7 = parseFragment`<footer class="arcgym-footer slds-text-align_center slds-m-top_large${0}"${2}><p class="slds-text-body_small slds-text-color_weak${0}"${2}>ArcGym practice is strictly grounded in official patterns from<a href="https://architect.salesforce.com" target="_blank" rel="noopener noreferrer" class="slds-text-link${0}"${2}>architect.salesforce.com</a>.</p><p class="slds-text-body_small slds-text-color_weak slds-m-top_xx-small${0}"${2}>© ArcGym. Built with open-source Lightning Web Components &amp; LWR.</p></footer>`;
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
    "arcgym-runner-wrapper": true,
    "slds-m-top_medium": true
  },
  key: 17
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, b: api_bind, sp: api_static_part, st: api_static_fragment, k: api_key, i: api_iterator, h: api_element, c: api_custom_element} = $api;
  const {_m0, _m1} = $ctx;
  return [api_element("div", stc0, [api_static_fragment($fragment1, 2, [api_static_part(16, null, api_dynamic_text($cmp.streakDays)), api_static_part(18, {
    on: _m0 || ($ctx._m0 = {
      "click": api_bind($cmp.handleAuthClick)
    })
  }, null), api_static_part(19, null, api_dynamic_text($cmp.authButtonLabel))]), api_element("main", stc1, [api_element("div", stc2, [api_element("div", stc3, [api_static_fragment($fragment2, 7, [api_static_part(4, null, api_dynamic_text($cmp.todayDrill.format) + " • " + api_dynamic_text($cmp.todayDrill.domain))]), api_element("div", stc4, api_iterator($cmp.todayDrill.pillars, function (pillar) {
    return api_static_fragment($fragment3, api_key(10, pillar), [api_static_part(1, null, api_dynamic_text(pillar))]);
  }))]), api_static_fragment($fragment4, 12, [api_static_part(1, null, api_dynamic_text($cmp.todayDrill.title))]), api_static_fragment($fragment5, 14, [api_static_part(1, null, api_dynamic_text($cmp.todayDrill.prompt))]), api_static_fragment($fragment6, 16), api_element("div", stc5, [api_custom_element("c-rapid-fire-runner", _cRapidFireRunner, {
    key: 18,
    on: _m1 || ($ctx._m1 = {
      "drillcomplete": api_bind($cmp.handleDrillComplete)
    })
  })])]), api_static_fragment($fragment7, 20)])])];
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
