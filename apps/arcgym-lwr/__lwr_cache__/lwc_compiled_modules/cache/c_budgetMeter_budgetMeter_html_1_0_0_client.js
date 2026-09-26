import _implicitStylesheets from "./budgetMeter.css";
import _implicitScopedStylesheets from "./budgetMeter.scoped.css?scoped=true";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="slds-grid slds-grid_align-spread slds-grid_vertical-align-center slds-m-bottom_xx-small${0}"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="meter-title font-weight-bold${0}"${2}>${"t3"}</span><span class="slds-m-left_small meter-badge${0}"${2}><span${"c5"}${2}>${"t6"}</span></span></div><div class="meter-readout${0}"${2}><span class="font-weight-bold meter-used-number${0}"${2}>${"t9"}</span><span class="meter-total-number${0}"${2}>${"t11"}</span></div></div>`;
const $fragment2 = parseFragment`<div class="meter-track${0}" role="progressbar" aria-valuemin="0"${"a0:aria-valuemax"}${"a0:aria-valuenow"}${2}><div${"c1"}${"s1"}${2}></div></div>`;
const $fragment3 = parseFragment`<span class="remaining-text${0}"${2}><span class="font-weight-bold${0}"${2}>${"t2"}</span>${"t3"}</span>`;
const $fragment4 = parseFragment`<span class="exceeded-text font-weight-bold${0}"${2}>${"t1"}</span>`;
const $fragment5 = parseFragment`<span class="percent-text${0}"${2}>${"t1"}</span>`;
const stc0 = {
  classMap: {
    "budget-meter-container": true,
    "slds-box": true,
    "slds-box_small": true,
    "slds-theme_shade": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "slds-grid": true,
    "slds-grid_align-spread": true,
    "slds-m-top_xx-small": true,
    "meter-subtext": true
  },
  key: 5
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, ncls: api_normalize_class_name, sp: api_static_part, st: api_static_fragment, h: api_element} = $api;
  return [api_element("div", stc0, [api_static_fragment($fragment1, 2, [api_static_part(3, null, api_dynamic_text($cmp.title)), api_static_part(5, {
    className: api_normalize_class_name($cmp.statusBadgeClass)
  }, null), api_static_part(6, null, api_dynamic_text($cmp.statusBadgeText)), api_static_part(9, null, api_dynamic_text($cmp.usedBudget)), api_static_part(11, null, " / " + api_dynamic_text($cmp.totalBudget) + " " + api_dynamic_text($cmp.unitLabel))]), api_static_fragment($fragment2, 4, [api_static_part(0, {
    attrs: {
      "aria-valuemax": $cmp.totalBudget,
      "aria-valuenow": $cmp.usedBudget
    }
  }, null), api_static_part(1, {
    className: api_normalize_class_name($cmp.meterStatusClass),
    style: $cmp.meterFillStyle
  }, null)]), api_element("div", stc1, [!$cmp.isOverBudget ? api_static_fragment($fragment3, 7, [api_static_part(2, null, api_dynamic_text($cmp.remainingBudget)), api_static_part(3, null, " " + api_dynamic_text($cmp.unitLabel) + " remaining")]) : null, $cmp.isOverBudget ? api_static_fragment($fragment4, 9, [api_static_part(1, null, "⚠️ Limit Exceeded by " + api_dynamic_text($cmp.exceededAmount) + " " + api_dynamic_text($cmp.unitLabel) + "! Architecture will throw runtime exception.")]) : null, api_static_fragment($fragment5, 11, [api_static_part(1, null, api_dynamic_text($cmp.percentUsed) + "% utilized")])])])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-1l0qd5spjbp";
tmpl.legacyStylesheetToken = "c-budgetMeter_budgetMeter";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
