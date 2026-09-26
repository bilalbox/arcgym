// eslint-disable-next-line lwr/only-allowed-type-imports

import { BOOTSTRAP_END, INIT, INIT_MODULE } from 'lwr/metrics';
import { logOperationStart, logOperationEnd } from 'lwr/profiler';
import { yieldIfNecessary } from 'lwr/scheduler';

// TODO: This is a temporal workaround until https://github.com/salesforce/lwc/pull/2083 is sorted - tmp
// eslint-disable-next-line lwr/only-allowed-imports
import { createElement, hydrateComponent } from 'lwc';

// hydration directive + value constants
// must align with the constants in @lwrjs/shared-utils/src/html-meta.ts
export const HYDRATE_DIRECTIVE = 'lwr:hydrate';
export const HYDRATE_VISIBLE_VALUE = 'visible';
function hydrateComponentProxy(customElement, Ctor, props) {
  hydrateComponent(customElement, Ctor, props);
}

/**
 * Hydrate the custom element only when it is visible.
 * @param customElement - The custom element to hydrate
 * @param ctor - The constructor of the custom element
 * @param props - The properties of the custom element
 */
function hydrateComponentOnVisible(customElement, ctor, props) {
  // Use IntersectionObserver for visibility-based hydration
  const observer = createVisibilityObserver();

  // add the element to the pending hydrations and observe it
  pendingHydrations.set(customElement, {
    ctor,
    props
  });
  observer.observe(customElement);
}

// store component metadata for pending hydrations
const pendingHydrations = new Map();

// store the visibility observer so that we don't create a new one each time
let visibilityObserver;

/**
 * Determines if a component should be hydrated when it becomes visible in the viewport.
 * This requires IntersectionObserver to be available and the hydrate directive to be set to 'visible'.
 * @param element - The element to check for visibility-based hydration
 * @returns True if the component should be hydrated when visible, false otherwise
 */
function shouldHydrateComponentWhenVisible(element) {
  return 'IntersectionObserver' in globalThis && element.getAttribute(HYDRATE_DIRECTIVE) === HYDRATE_VISIBLE_VALUE;
}

/**
 * Create an intersection observer for hydrating islands when visible, if one doesn't already exist.
 * @returns An intersection observer that will hydrate the island when visible
 */
function createVisibilityObserver() {
  // return the existing observer if it already exists
  if (visibilityObserver) return visibilityObserver;

  // create a new observer if it doesn't already exist
  visibilityObserver = new IntersectionObserver((entries, observer) => {
    // for each observed element, check if it is intersecting with the viewport
    entries.forEach(entry => {
      // if intersecting, hydrate the island
      if (entry.isIntersecting) {
        const element = entry.target;

        // stop observing the element
        observer.unobserve(element);

        // get the hydration data for the element
        const hydrationData = pendingHydrations.get(element);
        if (hydrationData) {
          // delete the hydration data for the element
          pendingHydrations.delete(element);
          const {
            ctor,
            props
          } = hydrationData;
          // hydrate the island
          hydrateComponentProxy(element, ctor, props);
        }
      }
    });
  }, {
    root: null,
    // adds a buffer to the intersection observer to hydrate the island slightly before it enters the viewport
    rootMargin: '100px'
  });
  return visibilityObserver;
}
function initializeWebComponent(elementName, Ctor) {
  return createElement(elementName, {
    is: Ctor
  });
}

/**
 * Convert a module specifier into a valid CustomElement registry name:
 *      - remove any version linking
 *      - change / to -
 *      - convert uppercase letters into "-${lowercase}"
 * eg: "c/app" => "c-app"
 * eg: "my/helloWorld" => "my-hello-world"
 * eg: "lwr/example/v/1.0.0" => "lwr-example"
 * @param specifier The bare specifier to convert
 */
export function toKebabCase(specifier) {
  return specifier.replace(/\/v\/[a-zA-Z0-9-_.]+$/, '').replace('/', '-').replace(/([A-Z])/g, c => `-${c.toLowerCase()}`);
}

/**
 * This method maps between attribute names
 * and the corresponding props name.
 */
const CAMEL_REGEX = /-([a-z])/g;
export function getPropFromAttrName(propName) {
  return propName.replace(CAMEL_REGEX, g => g[1].toUpperCase());
}

/**
 * Import any requested static application dependencies, define the root
 * application component(s) into the CustomElement registry, and inject them.
 * @param rootModules - An array of arrays, each one holding a pair of
 *                      bare specifier and corresponding LightningElement constructor
 * @example - [['x/appRoot', appCtor], ['x/nav', navCtor]]
 */
export function init(rootModules, serverData = {}) {
  // eslint-disable-next-line lwr/no-unguarded-apis
  if (typeof globalThis.customElements === 'undefined' || typeof globalThis.document === 'undefined') {
    logOperationStart({
      id: BOOTSTRAP_END
    });
    return;
  }
  logOperationStart({
    id: INIT
  });
  (async () => {
    let index = 0;
    // eslint-disable-next-line lwr/no-unguarded-apis
    const document = globalThis.document;
    for (const [specifier, ctor] of rootModules) {
      // Yield to the main thread during long hydration tasks
      // eslint-disable-next-line no-await-in-loop
      await yieldIfNecessary();
      const specifierIndex = ++index;
      const elementName = toKebabCase(specifier);

      // initialize and inject the root module into the LWR Root or DOM if it is missing
      // eslint-disable-next-line lwr/no-unguarded-apis
      if (!document.body.querySelector(elementName)) {
        logOperationStart({
          id: INIT_MODULE,
          specifier,
          specifierIndex
        });

        // this is for SPA like routes (one component at the root level) utilizing the lwr-root directive
        const component = initializeWebComponent(elementName, ctor);
        // eslint-disable-next-line lwr/no-unguarded-apis
        const container = document.querySelector('[lwr-root]');
        // eslint-disable-next-line lwr/no-unguarded-apis
        container ? container.appendChild(component) : document.body.appendChild(component);
        logOperationEnd({
          id: INIT_MODULE,
          specifier,
          specifierIndex,
          metadata: {
            renderMode: 'spa'
          }
        });
        continue;
      }

      // the page has been rendered or SSR'd, and each component needs to initialized(or hydrated)
      // eslint-disable-next-line lwr/no-unguarded-apis
      const elements = document.querySelectorAll(elementName);
      for (const element of elements) {
        logOperationStart({
          id: INIT_MODULE,
          specifier,
          specifierIndex
        });
        const propsId = element.dataset.lwrPropsId;

        // hydrate SSR'd components
        if (propsId) {
          // check if the element is a hydration visible island
          if (shouldHydrateComponentWhenVisible(element)) {
            // hydrate the island when visible
            hydrateComponentOnVisible(element, ctor, serverData[propsId] || {});
          } else {
            // hydrate the island immediately
            hydrateComponentProxy(element, ctor, serverData[propsId] || {});
          }
          logOperationEnd({
            id: INIT_MODULE,
            specifier,
            specifierIndex,
            metadata: {
              renderMode: 'ssr'
            }
          });
          continue;
        }

        // Note: due to the bug described at the top of this file, each CSR'd custom element
        // must be replaced with the new synthetic constructor. Attributes and children are
        // copied over to the new component.
        const component = initializeWebComponent(elementName, ctor);

        // copy the attributes
        for (const {
          name,
          value
        } of element.attributes) {
          component.setAttribute(name, value);
          const prop = getPropFromAttrName(name);
          if (prop in component) {
            // set attributes as properties for reactivity
            component[prop] = value;
          }
        }

        // save the children
        while (element.childNodes.length > 0) {
          component.appendChild(element.childNodes[0]);
        }

        // swap the element out with the initialized component
        const parent = element.parentElement;
        if (parent) {
          parent.replaceChild(component, element);
        }
        logOperationEnd({
          id: INIT_MODULE,
          specifier,
          specifierIndex,
          metadata: {
            renderMode: 'csr'
          }
        });
      }
    }
  })();
  logOperationEnd({
    id: INIT
  });
  logOperationStart({
    id: BOOTSTRAP_END
  });
}