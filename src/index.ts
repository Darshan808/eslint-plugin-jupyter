/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';
import tokenFormat from './rules/token-format';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
    'token-format': tokenFormat
  },
  configs: {
    recommended: {
      files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'warn',
        'jupyter/plugin-description': 'warn',
        'jupyter/token-format': 'error'
      }
    },
    'recommended-legacy': {
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'warn',
        'jupyter/plugin-description': 'warn',
        'jupyter/token-format': 'error'
      }
    }
  }
};

export = plugin;
