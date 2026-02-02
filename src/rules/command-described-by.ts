import { Rule } from 'eslint';
import * as ESTree from 'estree';
import { getObjectProperties } from '../utils/plugin-utils';
import { isAddCommandCall } from '../utils/commands';

const jupyterCommandDescribedBy: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure JupyterLab commands include describedBy property',
      recommended: 'recommended',
      url: 'https://github.com/jupyter-extensions/eslint-plugin-jupyter'
    },
    messages: {
      missingDescribedBy:
        'Command "{{ commandId }}" is missing the "describedBy" property.'
    },
    schema: []
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node: ESTree.Node) {
        const callExpr = node as ESTree.CallExpression;

        // Check if this is <something>.addCommand()
        if (!isAddCommandCall(callExpr)) {
          return;
        }

        // Get the command ID and options
        if (callExpr.arguments.length < 2) {
          return;
        }

        const commandIdArg = callExpr.arguments[0];
        const optionsArg = callExpr.arguments[1];

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

        const options = optionsArg as ESTree.ObjectExpression;
        const properties = getObjectProperties(options);

        // Check if execute function exists and has parameters
        const executeProp = properties.get('execute');
        if (!executeProp || executeProp.value.type === 'Literal') {
          return;
        }

        const describedByProp = properties.get('describedBy');

        if (!describedByProp) {
          context.report({
            node: callExpr,
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
};

export = jupyterCommandDescribedBy;
