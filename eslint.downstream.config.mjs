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

export default [
  {
    basePath: __dirname,
    files: ['jupyterlab/packages/*/src/**/*.ts', "notebook/packages/*/src/**/*.ts"],
    plugins: {
      'jupyter': resolvedPlugin,
      '@typescript-eslint': resolvedTsPlugin  // registered but rules not enforced
    },
    rules: {
      'jupyter/command-described-by': 'error',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'error'
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
  }
];