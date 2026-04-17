/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';
import tokenFormat from './rules/token-format';
import noUntranslatedString from './rules/no-untranslated-string';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
    'token-format': tokenFormat
    'no-untranslated-string': noUntranslatedString
  },
  configs: {
    recommended: {
      files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'warn',
        'jupyter/plugin-description': 'warn',
        'jupyter/token-format': 'error'
        'jupyter/no-untranslated-string': 'warn'
      }
    },
    'recommended-legacy': {
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'warn',
        'jupyter/plugin-description': 'warn',
        'jupyter/token-format': 'error'
        'jupyter/no-untranslated-string': 'warn'
      }
    }
  }
};

export = plugin;
