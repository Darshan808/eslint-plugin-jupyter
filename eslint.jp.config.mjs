/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pluginModule = await import(path.resolve(__dirname, 'lib/index.js'));
// CJS modules imported via ESM land as { default: { rules, configs }, rules, configs }
// We want the object that actually has .rules on it
const resolvedPlugin = pluginModule.default?.rules ? pluginModule.default : pluginModule;
const parserModule = await import('@typescript-eslint/parser');
// Same CJS/ESM interop issue applies to the parser
const resolvedParser = parserModule.default ?? parserModule;
export default [
  {
    basePath: __dirname,  // explicitly anchor to this config file's directory
    files: ['jupyterlab/packages/*/src/**/*.ts'],
    plugins: {
      'jupyter': resolvedPlugin
    },
    rules: {
      'jupyter/command-described-by': 'warn',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'warn'
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