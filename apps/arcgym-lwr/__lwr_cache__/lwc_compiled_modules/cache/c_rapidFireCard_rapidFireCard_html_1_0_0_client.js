import _implicitStylesheets from "./rapidFireCard.css";
import _implicitScopedStylesheets from "./rapidFireCard.scoped.css?scoped=true";
import {freezeTemplate, parseFragment, registerTemplate} from "lwc";
const $fragment1 = parseFragment`<div class="prompt-box slds-box slds-box_small slds-theme_shade slds-m-bottom_medium${0}"${2}><p class="prompt-text${0}"${2}>${"t2"}</p></div>`;
const $fragment2 = parseFragment`<div${"c0"}${"a0:data-id"} role="radio"${"a0:aria-checked"} tabindex="0"${2}><div class="slds-grid slds-grid_vertical-align-center${0}"${2}><span class="option-marker${0}"${2}>${"t3"}</span><span class="option-label${0}"${2}>${"t5"}</span></div></div>`;
const stc0 = {
  classMap: {
    "card-wrapper": true
  },
  key: 0
};
const stc1 = {
  classMap: {
    "options-group": true,
    "slds-m-bottom_medium": true
  },
  attrs: {
    "role": "radiogroup",
    "aria-label": "Architectural Trade-Off Options"
  },
  key: 3
};
function tmpl($api, $cmp, $slotset, $ctx) {
  const {d: api_dynamic_text, sp: api_static_part, st: api_static_fragment, ncls: api_normalize_class_name, k: api_key, b: api_bind, i: api_iterator, h: api_element} = $api;
  const {_m0, _m1} = $ctx;
  return [api_element("div", stc0, [api_static_fragment($fragment1, 2, [api_static_part(2, null, api_dynamic_text($cmp.prompt))]), api_element("div", stc1, api_iterator($cmp.formattedOptions, function (opt) {
    return api_static_fragment($fragment2, api_key(5, opt.id), [api_static_part(0, {
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
  }))])];
  /*LWC compiler v8.28.2*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];
tmpl.stylesheetToken = "lwc-3v9gcrcf996";
tmpl.legacyStylesheetToken = "c-rapidFireCard_rapidFireCard";
if (_implicitStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitStylesheets);
}
if (_implicitScopedStylesheets) {
  tmpl.stylesheets.push.apply(tmpl.stylesheets, _implicitScopedStylesheets);
}
freezeTemplate(tmpl);
