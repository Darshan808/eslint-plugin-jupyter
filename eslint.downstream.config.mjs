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

// This prevents "Definition for rule not found" errors from eslint-disable comments
const tsPlugin = await import('@typescript-eslint/eslint-plugin');
const resolvedTsPlugin = tsPlugin.default ?? tsPlugin;

function makeProjectConfig(projectName) {
  return {
    basePath: __dirname,
    files: [
      `${projectName}/packages/*/src/**/*.ts`,
      `${projectName}/packages/*/src/**/*.tsx`
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

export default [
  makeProjectConfig('jupyterlab'),
  makeProjectConfig('notebook'),
  makeProjectConfig('jupyterlite')
];