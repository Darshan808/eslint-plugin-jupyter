/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pluginModule = await import(path.resolve(__dirname, 'lib/index.js'));
const resolvedPlugin = pluginModule.default?.rules
  ? pluginModule.default
  : pluginModule;
const lazyImportsModule = await import(
  path.resolve(__dirname, 'lib/utils/lazy-imports.js')
);
const lazyImports = lazyImportsModule.default ?? lazyImportsModule;
const parserModule = await import('@typescript-eslint/parser');
const resolvedParser = parserModule.default ?? parserModule;

// Prevents "Definition for rule not found" errors
const tsPlugin = await import('@typescript-eslint/eslint-plugin');
const resolvedTsPlugin = tsPlugin.default ?? tsPlugin;
const noopRule = { create: () => ({}) };
const jestStub = { rules: new Proxy({}, { get: () => noopRule }) };
const regexStub = { rules: new Proxy({}, { get: () => noopRule }) };
const playwrightStub = { rules: new Proxy({}, { get: () => noopRule }) };

const jsoncParserModule = await import('jsonc-eslint-parser');
const resolvedJsoncParser = jsoncParserModule.default ?? jsoncParserModule;

// The package lists from JupyterLab's own eslint.config.mjs.
const JUPYTERLAB_LAZY_IMPORTS = {
  deferredPackages: [
    ...lazyImports.DEFAULT_DEFERRED_PACKAGES,
    'regexp-match-indices'
  ],
  allowedPackages: [
    ...lazyImports.DEFAULT_ALLOWED_PACKAGES,
    '@codemirror/autocomplete',
    '@codemirror/commands',
    '@rjsf/core',
    '@rjsf/utils'
  ]
};

// The ignored imports from Notebook's own eslint.config.mjs.
const NOTEBOOK_LAZY_IMPORTS = {
  ignoreImports: ['@jupyter-notebook/*']
};

// The ignored imports from JupyterLite's eslint.config.mjs in
// jupyterlite/jupyterlite#2095.
const JUPYTERLITE_LAZY_IMPORTS = {
  ignoreImports: ['@jupyterlite/*', 'localforage', 'mock-socket']
};

const PROJECT_LAZY_IMPORTS = {
  jupyterlab: JUPYTERLAB_LAZY_IMPORTS,
  notebook: NOTEBOOK_LAZY_IMPORTS,
  jupyterlite: JUPYTERLITE_LAZY_IMPORTS
};

function makeProjectConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/packages/*/src/**/*.ts`,
      `${projectName}/packages/*/src/**/*.tsx`
    ],
    plugins: {
      jupyter: resolvedPlugin,
      '@typescript-eslint': resolvedTsPlugin,
      jest: jestStub,
      regexp: regexStub
    },
    rules: {
      'jupyter/command-described-by': 'error',
      'jupyter/command-id-convention': 'error',
      'jupyter/no-untranslated-string': 'error',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'error',
      'jupyter/plugin-id-convention': 'error',
      'jupyter/no-translation-concatenation': 'error',
      'jupyter/no-dynamic-translation': 'error',
      'jupyter/token-format': 'error',
      'jupyter/require-soft-assertions-before-snapshots': 'error',
      'jupyter/require-signal-cleanup': 'error',
      'jupyter/require-signal-this-arg': 'error',
      'jupyter/prefer-signal-this-arg': 'error',
      'jupyter/require-disposable-ownership': 'error',
      'jupyter/require-disposable-transfer': 'error',
      'jupyter/incorrect-translator-usage': 'error',
      'jupyter/prefer-lazy-imports': [
        'error',
        {
          reportInteractionCallbacks: true,
          reportReExports: true,
          ...PROJECT_LAZY_IMPORTS[projectName]
        }
      ]
    },
    languageOptions: {
      parser: resolvedParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: path.resolve(__dirname, `${projectName}/tsconfig.eslint.json`)
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  };
}

function makeExtensionAdoptionConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/packages/*-extension/src/**/*.ts`,
      `${projectName}/packages/*-extension/src/**/*.tsx`
    ],
    rules: {
      'jupyter/require-disposable-ownership': 'warn',
      'jupyter/require-disposable-transfer': 'warn'
    }
  };
}

function makeDisposableTestSeverityConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/**/*.spec.ts`,
      `${projectName}/**/*.test.ts`,
      `${projectName}/packages/*/src/testutils.ts`
    ],
    rules: {
      'jupyter/require-disposable-ownership': 'warn',
      'jupyter/require-disposable-transfer': 'warn',
      'jupyter/prefer-lazy-imports': 'off',
      'jupyter/plugin-id-convention': 'off',
      'jupyter/command-id-convention': 'off'
    }
  };
}

function makeTestConfig(projectName) {
  return [
    {
      basePath: __dirname,
      files: [`${projectName}/**/*.spec.ts`, `${projectName}/**/*.test.ts`],
      plugins: {
        jupyter: resolvedPlugin,
        '@typescript-eslint': resolvedTsPlugin,
        jest: jestStub,
        playwright: playwrightStub
      },
      rules: {
        'jupyter/require-soft-assertions-before-snapshots': 'error'
      },
      languageOptions: {
        parser: resolvedParser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module'
        }
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'off'
      }
    },

    // Galata UI tests (JupyterLab's galata/test, Notebook's and JupyterLite's
    // ui-tests/test)
    {
      basePath: __dirname,
      files: [
        `${projectName}/galata/test/**/*.ts`,
        `${projectName}/ui-tests/test/**/*.ts`
      ],
      ignores: [
        `${projectName}/galata/src/helpers/**`,
        // Benchmarks use the plain Playwright fixture, without Galata page helpers.
        `${projectName}/galata/test/benchmark/**`
      ],
      plugins: {
        jupyter: resolvedPlugin,
        '@typescript-eslint': resolvedTsPlugin,
        jest: jestStub,
        playwright: playwrightStub
      },
      rules: {
        'jupyter/galata-prefer-context-menu-helper': 'warn',
        'jupyter/galata-prefer-filebrowser-helper': 'warn',
        'jupyter/galata-prefer-menu-helper': 'warn',
        'jupyter/galata-prefer-notebook-cell-helper': 'warn',
        'jupyter/galata-prefer-sidebar-activity-helper': 'warn'
      },
      languageOptions: {
        parser: resolvedParser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module'
        }
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'off'
      }
    },

    // JupyterLab — settings schema JSON files
    {
      basePath: __dirname,
      files: ['jupyterlab/packages/*/schema/*.json'],
      plugins: { jupyter: resolvedPlugin },
      rules: { 'jupyter/no-schema-enum': 'error' },
      languageOptions: { parser: resolvedJsoncParser }
    },

    // Notebook — settings schema JSON files
    {
      basePath: __dirname,
      files: ['notebook/packages/*/schema/*.json'],
      plugins: { jupyter: resolvedPlugin },
      rules: { 'jupyter/no-schema-enum': 'error' },
      languageOptions: { parser: resolvedJsoncParser }
    },

    // JupyterLite — settings schema JSON files
    {
      basePath: __dirname,
      files: ['jupyterlite/packages/*/schema/*.json'],
      plugins: { jupyter: resolvedPlugin },
      rules: { 'jupyter/no-schema-enum': 'error' },
      languageOptions: { parser: resolvedJsoncParser }
    }
  ];
}

const projects = ['jupyterlab', 'notebook', 'jupyterlite'];

export default [
  ...projects.map(makeProjectConfig),
  ...projects.map(makeExtensionAdoptionConfig),
  ...projects.map(makeDisposableTestSeverityConfig),
  ...projects.flatMap(makeTestConfig)
];
