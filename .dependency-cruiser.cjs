/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No runtime circular dependencies are allowed anywhere in the repo.',
      from: {},
      to: {
        circular: true,
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'drill-core-pure',
      severity: 'error',
      comment:
        'packages/drill-core must remain pure domain logic without UI, Web, or scripts dependencies.',
      from: {
        path: '^packages/drill-core/src',
      },
      to: {
        path: '^(apps/|scripts/|react$|react-dom$)',
      },
    },
    {
      name: 'web-client-no-functions',
      severity: 'error',
      comment:
        'Client UI in apps/arcgym-web/src must never import Cloudflare Pages functions directly.',
      from: {
        path: '^apps/arcgym-web/src',
      },
      to: {
        path: '^apps/arcgym-web/functions',
      },
    },
    {
      name: 'web-functions-no-client',
      severity: 'error',
      comment: 'Cloudflare Pages functions must not import React components or client UI code.',
      from: {
        path: '^apps/arcgym-web/functions',
      },
      to: {
        path: '^(apps/arcgym-web/src|react$|react-dom$)',
      },
    },
    {
      name: 'no-importing-scripts',
      severity: 'error',
      comment: 'Production packages and web apps must never import tooling scripts.',
      from: {
        path: '^(apps/|packages/)',
      },
      to: {
        path: '^scripts/',
      },
    },
  ],
  options: {
    parser: 'swc',
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: '(^|/)(\\..+|dist|coverage|node_modules)(\\/|$)',
    },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
