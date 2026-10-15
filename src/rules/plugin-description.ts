/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/utils';
import {
  getObjectProperties,
  getPluginId,
  getPluginObjectKind
} from '../utils/plugin-utils';
import { getTypeServices } from '../utils/type-services';

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
    const { checker, getTSNode } = getTypeServices(context);

    return {
      ObjectExpression(node) {
        const hasId = getObjectProperties(node).has('id');
        if (!hasId) {
          return;
        }

        const pluginKind = getPluginObjectKind(node, checker, getTSNode);
        if (
          pluginKind !== 'frontend' &&
          pluginKind !== 'service-manager' &&
          pluginKind !== 'ambiguous'
        ) {
          return;
        }

        const pluginId = getPluginId(
          node,
          context.sourceCode.getScope(node),
          checker,
          getTSNode
        );
        const pluginIdSuffix = pluginId ? ` "${pluginId}"` : '';

        const descriptionStatus = checkDescriptionProperty(node);
        if (descriptionStatus !== 'present') {
          context.report({
            node,
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
