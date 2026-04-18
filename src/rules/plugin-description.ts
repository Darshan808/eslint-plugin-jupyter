/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';
import { getJupyterPluginKind, getPluginId } from '../utils/plugin-utils';

type DescriptionStatus = 'missing' | 'empty' | 'present';

/**
 * Returns whether the object expression has a description property and whether
 * it is non-empty.
 *
 * - 'missing'  – no description key found
 * - 'empty'    – key exists but its literal value is empty / whitespace-only
 * - 'present'  – key exists with a non-empty value (or a non-literal value)
 */
function checkDescriptionProperty(
  obj: TSESTree.ObjectExpression
): DescriptionStatus {
  for (const prop of obj.properties) {
    if (prop.type === 'Property') {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName === 'description') {
        if (prop.value.type === 'Literal') {
          const value = prop.value.value;
          return typeof value === 'string' && value.trim().length > 0
            ? 'present'
            : 'empty';
        }
        return 'present';
      }
    }
  }
  return 'missing';
}

const jupyterPluginDescription = createRule({
  name: 'plugin-description',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all JupyterLab plugins have a description property',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/plugin-description/'
    },
    messages: {
      missingDescription:
        'JupyterLab plugin{{ pluginId }} is missing a "description" property.',
      emptyDescription:
        'JupyterLab plugin{{ pluginId }} has an empty "description" property.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      VariableDeclarator(varDecl) {
        // Check if this has a JupyterFrontEndPlugin type annotation
        if (!getJupyterPluginKind(varDecl)) {
          return;
        }

        // Check if init is an object expression
        if (!varDecl.init || varDecl.init.type !== 'ObjectExpression') {
          return;
        }

        const pluginId = getPluginId(varDecl.init);
        const pluginIdSuffix = pluginId ? ` "${pluginId}"` : '';

        // Check if description property exists and is non-empty
        const descriptionStatus = checkDescriptionProperty(varDecl.init);
        if (descriptionStatus !== 'present') {
          context.report({
            node: varDecl.init,
            messageId:
              descriptionStatus === 'empty'
                ? 'emptyDescription'
                : 'missingDescription',
            data: { pluginId: pluginIdSuffix }
          });
        }
      }
    };
  }
});

export = jupyterPluginDescription;
