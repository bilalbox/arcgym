/**
 * This module is called in the ABS module (app bootstrap module) to perform neccesary pre initialization steps for an LWR app.
 * Note: this module should be imported before other dependencies in the ABS
 */

const GLOBAL = globalThis;
const lwrGlobals = GLOBAL.LWR;
if (lwrGlobals.define || lwrGlobals.env || lwrGlobals.importMap) {
  // AMD only
  GLOBAL.LWR = Object.freeze({
    define: lwrGlobals.define,
    env: lwrGlobals.env,
    importMap: lwrGlobals.importMap
  });
} else {
  delete GLOBAL.LWR;
}
export function getClientBootstrapConfig() {
  return lwrGlobals;
}