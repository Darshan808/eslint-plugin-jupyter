/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as jsoncParser from 'jsonc-eslint-parser';
import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';
import noTranslationConcatenation from './rules/no-translation-concatenation';
import tokenFormat from './rules/token-format';
import noUntranslatedString from './rules/no-untranslated-string';
import noSchemaEnum from './rules/no-schema-enum';
import requireSoftAssertionsBeforeSnapshots from './rules/require-soft-assertions-before-snapshots';
import noPageconfigBaseUrl from './rules/no-pageconfig-base-url';
import galataPreferFilebrowserHelper from './rules/galata-prefer-filebrowser-helper';
import galataPreferMenuHelper from './rules/galata-prefer-menu-helper';
import galataPreferContextMenuHelper from './rules/galata-prefer-context-menu-helper';
import galataPreferNotebookCellHelper from './rules/galata-prefer-notebook-cell-helper';
import galataPreferSidebarActivityHelper from './rules/galata-prefer-sidebar-activity-helper';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
    'no-translation-concatenation': noTranslationConcatenation,
    'token-format': tokenFormat,
    'no-untranslated-string': noUntranslatedString,
    'no-schema-enum': noSchemaEnum,
    'require-soft-assertions-before-snapshots':
      requireSoftAssertionsBeforeSnapshots,
    'no-pageconfig-base-url': noPageconfigBaseUrl,
    'galata-prefer-filebrowser-helper': galataPreferFilebrowserHelper,
    'galata-prefer-menu-helper': galataPreferMenuHelper,
    'galata-prefer-context-menu-helper': galataPreferContextMenuHelper,
    'galata-prefer-notebook-cell-helper': galataPreferNotebookCellHelper,
    'galata-prefer-sidebar-activity-helper': galataPreferSidebarActivityHelper
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
          'jupyter/no-untranslated-string': 'warn',
          'jupyter/no-pageconfig-base-url': 'warn'
        }
      },
      {
        files: ['**/schema/*.json'],
        languageOptions: { parser: jsoncParser },
        rules: {
          'jupyter/no-schema-enum': 'warn'
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
          'jupyter/require-soft-assertions-before-snapshots': 'warn',
          'jupyter/galata-prefer-filebrowser-helper': 'warn',
          'jupyter/galata-prefer-menu-helper': 'warn',
          'jupyter/galata-prefer-context-menu-helper': 'warn',
          'jupyter/galata-prefer-notebook-cell-helper': 'warn',
          'jupyter/galata-prefer-sidebar-activity-helper': 'warn'
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
        'jupyter/no-untranslated-string': 'warn',
        'jupyter/no-schema-enum': 'warn',
        'jupyter/no-pageconfig-base-url': 'warn'
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
            'jupyter/require-soft-assertions-before-snapshots': 'warn',
            'jupyter/galata-prefer-filebrowser-helper': 'warn',
            'jupyter/galata-prefer-menu-helper': 'warn',
            'jupyter/galata-prefer-context-menu-helper': 'warn',
            'jupyter/galata-prefer-notebook-cell-helper': 'warn',
            'jupyter/galata-prefer-sidebar-activity-helper': 'warn'
          }
        }
      ]
    }
  }
};

export = plugin;
