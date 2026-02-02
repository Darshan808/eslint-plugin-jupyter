import { Rule } from 'eslint';
import * as ESTree from 'estree';
import { hasJupyterPluginType, getPluginId } from '../utils/plugin-utils';

/**
 * Checks if an object expression has a description property
 */
function hasDescriptionProperty(obj: ESTree.ObjectExpression): boolean {
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
        // Check if description value is not empty
        if (prop.value.type === 'Literal') {
          const value = (prop.value as ESTree.Literal).value;
          return typeof value === 'string' && value.trim().length > 0;
        }
        return true; // Non-literal descriptions are assumed valid
      }
    }
  }
  return false;
}

const jupyterPluginDescription: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure all JupyterLab plugins have a description property',
      recommended: 'recommended',
      url: 'https://github.com/jupyter-extensions/eslint-plugin-jupyter'
    },
    messages: {
      missingDescription:
        'JupyterLab plugin{{ pluginId }} is missing a "description" property.',
      emptyDescription:
        'JupyterLab plugin{{ pluginId }} has an empty "description" property.'
    },
    schema: []
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      VariableDeclarator(node: ESTree.Node) {
        const varDecl = node as ESTree.VariableDeclarator;

        // Check if this has a JupyterFrontEndPlugin type annotation
        if (!hasJupyterPluginType(varDecl)) {
          return;
        }

        // Check if init is an object expression
        if (!varDecl.init || varDecl.init.type !== 'ObjectExpression') {
          return;
        }

        const pluginObj = varDecl.init as ESTree.ObjectExpression;
        const pluginId = getPluginId(pluginObj);
        const pluginIdSuffix = pluginId ? ` "${pluginId}"` : '';

        // Check if description property exists
        if (!hasDescriptionProperty(pluginObj)) {
          context.report({
            node: pluginObj,
            messageId: 'missingDescription',
            data: { pluginId: pluginIdSuffix }
          });
        }
      }
    };
  }
};

export = jupyterPluginDescription;
