/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';
import noTranslationConcatenation from './rules/no-translation-concatenation';
import tokenFormat from './rules/token-format';
import noUntranslatedString from './rules/no-untranslated-string';
import requireSoftAssertionsBeforeSnapshots from './rules/require-soft-assertions-before-snapshots';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
    'no-translation-concatenation': noTranslationConcatenation,
    'token-format': tokenFormat,
    'no-untranslated-string': noUntranslatedString,
    'require-soft-assertions-before-snapshots':
      requireSoftAssertionsBeforeSnapshots
  },
  configs: {
    recommended: [
      {
        files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
        rules: {
          'jupyter/plugin-activation-args': 'error',
          'jupyter/command-described-by': 'warn',
          'jupyter/plugin-description': 'warn',
          'jupyter/no-translation-concatenation': 'error',
          'jupyter/token-format': 'error',
          'jupyter/no-untranslated-string': 'warn'
        }
      },
      {
        files: [
          '**/*.spec.ts',
          '**/*.spec.js',
          '**/*.test.ts',
          '**/*.test.js'
        ],
        rules: {
          'jupyter/require-soft-assertions-before-snapshots': 'warn'
        }
      }
    ],
    'recommended-legacy': {
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'warn',
        'jupyter/plugin-description': 'warn',
        'jupyter/no-translation-concatenation': 'error',
        'jupyter/token-format': 'error',
        'jupyter/no-untranslated-string': 'warn'
      },
      overrides: [
        {
          files: [
            '**/*.spec.ts',
            '**/*.spec.js',
            '**/*.test.ts',
            '**/*.test.js'
          ],
          rules: {
            'jupyter/require-soft-assertions-before-snapshots': 'warn'
          }
        }
      ]
    }
  }
};

export = plugin;
