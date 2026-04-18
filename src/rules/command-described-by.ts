/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { getObjectProperties } from '../utils/plugin-utils';
import { isAddCommandCall } from '../utils/commands';
import { createRule } from '../utils/create-rule';

const jupyterCommandDescribedBy = createRule({
  name: 'command-described-by',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure JupyterLab commands include describedBy property',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/command-described-by/'
    },
    messages: {
      missingDescribedBy:
        'Command "{{ commandId }}" is missing the "describedBy" property.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      CallExpression(node) {
        // Check if this is <something>.addCommand()
        if (!isAddCommandCall(node)) {
          return;
        }

        // Get the command ID and options
        if (node.arguments.length < 2) {
          return;
        }

        const commandIdArg = node.arguments[0];
        const optionsArg = node.arguments[1];

        // Extract command ID for error message
        let commandId = 'unknown';
        if (
          commandIdArg.type === 'Literal' &&
          typeof commandIdArg.value === 'string'
        ) {
          commandId = commandIdArg.value;
        } else if (commandIdArg.type === 'Identifier') {
          commandId = commandIdArg.name;
        } else if (commandIdArg.type === 'MemberExpression') {
          // Handle CommandIDs.something pattern
          if (commandIdArg.property.type === 'Identifier') {
            commandId = commandIdArg.property.name;
          }
        }

        // Options must be an object
        if (optionsArg.type !== 'ObjectExpression') {
          return;
        }

        const properties = getObjectProperties(optionsArg);

        // Check if execute function exists and has parameters
        const executeProp = properties.get('execute');
        if (!executeProp || executeProp.value.type === 'Literal') {
          return;
        }

        const describedByProp = properties.get('describedBy');

        if (!describedByProp) {
          context.report({
            node,
            messageId: 'missingDescribedBy',
            data: { commandId }
          });
          return;
        }

        if (describedByProp.value.type !== 'ObjectExpression') {
          return;
        }
      }
    };
  }
});

export = jupyterCommandDescribedBy;
