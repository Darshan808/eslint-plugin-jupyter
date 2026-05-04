/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pluginModule = await import(path.resolve(__dirname, 'lib/index.js'));
const resolvedPlugin = pluginModule.default?.rules ? pluginModule.default : pluginModule;
const parserModule = await import('@typescript-eslint/parser');
const resolvedParser = parserModule.default ?? parserModule;

// Prevents "Definition for rule not found" errors from eslint-disable comments
const tsPlugin = await import('@typescript-eslint/eslint-plugin');
const resolvedTsPlugin = tsPlugin.default ?? tsPlugin;

<<<<<<< forbid-enum
const jsoncParserModule = await import('jsonc-eslint-parser');
const resolvedJsoncParser = jsoncParserModule.default ?? jsoncParserModule;

export default [
  // JupyterLab
  {
    basePath: __dirname,
    files: [
      'jupyterlab/packages/*/src/**/*.ts',
      'jupyterlab/packages/*/src/**/*.tsx'
    ],
    plugins: {
      'jupyter': resolvedPlugin,
      '@typescript-eslint': resolvedTsPlugin
    },
    rules: {
      'jupyter/command-described-by': 'error',
      'jupyter/no-untranslated-string': 'error',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'error',
      'jupyter/no-translation-concatenation': 'error',
      'jupyter/token-format': 'error'
    },
    languageOptions: {
      parser: resolvedParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: path.resolve(__dirname, 'jupyterlab/tsconfig.eslint.json')
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  },
=======
// Stub: satisfies ESLint's rule-name validation for jest/* disable comments
// without importing the real plugin or enabling any jest rules.
const noopRule = { create: () => ({}) };
const jestStub = { rules: new Proxy({}, { get: () => noopRule }) };
>>>>>>> main

function makeProjectConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/packages/*/src/**/*.ts`,
      `${projectName}/packages/*/src/**/*.tsx`
    ],
    plugins: {
      'jupyter': resolvedPlugin,
      '@typescript-eslint': resolvedTsPlugin,
      'jest': jestStub
    },
    rules: {
      'jupyter/command-described-by': 'error',
      'jupyter/no-untranslated-string': 'error',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'error',
      'jupyter/no-translation-concatenation': 'error',
      'jupyter/token-format': 'error',
      'jupyter/require-soft-assertions-before-snapshots': 'error'
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

function makeTestConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/**/*.spec.ts`,
      `${projectName}/**/*.test.ts`
    ],
    plugins: {
      'jupyter': resolvedPlugin,
      '@typescript-eslint': resolvedTsPlugin,
      'jest': jestStub,
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
<<<<<<< forbid-enum
  },

  // JupyterLab — settings schema JSON files
  {
    basePath: __dirname,
    files: ['jupyterlab/packages/*/schema/*.json'],
    plugins: { 'jupyter': resolvedPlugin },
    rules: { 'jupyter/no-schema-enum': 'error' },
    languageOptions: { parser: resolvedJsoncParser }
  },

  // Notebook — settings schema JSON files
  {
    basePath: __dirname,
    files: ['notebook/packages/*/schema/*.json'],
    plugins: { 'jupyter': resolvedPlugin },
    rules: { 'jupyter/no-schema-enum': 'error' },
    languageOptions: { parser: resolvedJsoncParser }
  },

  // JupyterLite — settings schema JSON files
  {
    basePath: __dirname,
    files: ['jupyterlite/packages/*/schema/*.json'],
    plugins: { 'jupyter': resolvedPlugin },
    rules: { 'jupyter/no-schema-enum': 'error' },
    languageOptions: { parser: resolvedJsoncParser }
  }
=======
  };
}

const projects = ['jupyterlab', 'notebook', 'jupyterlite'];

export default [
  ...projects.map(makeProjectConfig),
  ...projects.map(makeTestConfig)
>>>>>>> main
];