import _implicitStylesheets from "./confidenceGate.css";
import _implicitScopedStylesheets from "./confidenceGate.scoped.css?scoped=true";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<label class="slds-text-title_caps slds-text-color_weak slds-m-bottom_xx-small gate-label${0}"${2}>Say how sure you are (Confidence Calibration):</label>`;
const $fragment2 = parseFragment`<button type="button"${"c0"}${"a0:data-value"}${"a0:aria-pressed"}${"a0:disabled"}${"a0:title"}${2}><span class="chip-percent${0}"${2}>${"t2"}</span><span class="chip-title${0}"${2}>${"t4"}</span></button>`;
const stc0 = {
  classMap: {
    "confidence-gate": true,
    "slds-p-vertical_small": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "slds-grid": true,
    "slds-wrap": true,
    "chip-container": true,
    "slds-m-top_xx-small": true
  },
  attrs: {
    "role": "group",
    "aria-label": "Confidence Calibration Selection"
  },
  key: 3
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {st: api_static_fragment, ncls: api_normalize_class_name, k: api_key, b: api_bind, d: api_dynamic_text, sp: api_static_part, i: api_iterator, h: api_element} = $api;
  const {_m0, _m1} = $ctx;
  return [api_element("div", stc0, [api_static_fragment($fragment1, 2), api_element("div", stc1, api_iterator($cmp.anchors, function (anchor) {
    return api_static_fragment($fragment2, api_key(5, anchor.value), [api_static_part(0, {
      on: _m1 || ($ctx._m1 = {
        "click": api_bind($cmp.handleSelectAnchor)
      }),
      className: api_normalize_class_name(anchor.cssClass),
      attrs: {
        "data-value": anchor.value,
        "aria-pressed": anchor.isSelected,
        "disabled": $cmp.disabled ? "" : null,
        "title": anchor.tooltip
      }
    }, null), api_static_part(2, null, api_dynamic_text(anchor.percentLabel)), api_static_part(4, null, api_dynamic_text(anchor.title))]);
  }))])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-1rkqaptmccn";
tmpl.legacyStylesheetToken = "c-confidenceGate_confidenceGate";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
