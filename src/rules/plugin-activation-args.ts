import { Rule } from 'eslint';
import * as ESTree from 'estree';
import {
  hasJupyterPluginType,
  extractIdentifierNames,
  extractParameterType
} from '../utils/plugin-utils';

interface ActivateFunctionInfo {
  node: ESTree.Node;
  params: string[];
  paramTypes: (string | null)[];
}

interface RequiresOptionalInfo {
  requires: string[];
  optional: string[];
}

/**
 * Finds the activate function in the plugin object
 */
function findActivateFunction(
  node: ESTree.ObjectExpression
): ActivateFunctionInfo | null {
  const activateProp = node.properties.find(
    prop =>
      ((prop.type === 'Property' || prop.type === 'SpreadElement') &&
        prop.type === 'Property' &&
        ((prop.key.type === 'Identifier' && prop.key.name === 'activate') ||
          (prop.key.type === 'Literal' && prop.key.value === 'activate'))) ||
      prop.type === 'SpreadElement'
  ) as ESTree.Property | undefined;

  if (!activateProp || activateProp.type !== 'Property') {
    return null;
  }

  const activateValue = activateProp.value;

  // Handle both arrow functions and regular functions
  if (
    (activateValue.type === 'ArrowFunctionExpression' ||
      activateValue.type === 'FunctionExpression') &&
    activateValue.params
  ) {
    const params = activateValue.params
      .filter(
        (param): param is ESTree.Identifier => param.type === 'Identifier'
      )
      .map(param => param.name);

    // Extract type annotations if available
    const paramTypes = activateValue.params
      .filter(
        (param): param is ESTree.Identifier => param.type === 'Identifier'
      )
      .map(param => extractParameterType(param));

    return { node: activateProp, params, paramTypes };
  }

  return null;
}

/**
 * Extracts requires and optional arrays from a plugin object
 */
function extractRequiresOptional(
  node: ESTree.ObjectExpression
): RequiresOptionalInfo {
  const result: RequiresOptionalInfo = {
    requires: [],
    optional: []
  };

  const props = node.properties as ESTree.Property[];

  for (const prop of props) {
    if (prop.type !== 'Property') continue;

    let keyName: string | null = null;
    if (prop.key.type === 'Identifier') {
      keyName = prop.key.name;
    } else if (
      prop.key.type === 'Literal' &&
      typeof prop.key.value === 'string'
    ) {
      keyName = prop.key.value;
    }

    if (keyName === 'requires' && prop.value.type === 'ArrayExpression') {
      result.requires = extractIdentifierNames(
        prop.value as ESTree.ArrayExpression
      );
    } else if (
      keyName === 'optional' &&
      prop.value.type === 'ArrayExpression'
    ) {
      result.optional = extractIdentifierNames(
        prop.value as ESTree.ArrayExpression
      );
    }
  }

  return result;
}

const jupyterPluginActivationArgs: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order',
      recommended: 'recommended',
      url: 'https://github.com/jupyter-extensions/eslint-plugin-jupyter'
    },
    messages: {
      mismatchedOrder:
        'Activation argument "{{ arg }}" does not match the order of requires/optional tokens.',
      missingArgument:
        'Token "{{ token }}" from requires/optional is missing in activation arguments.',
      extraArgument:
        'Activation argument "{{ arg }}" is not in requires/optional tokens.',
      appNotFirst:
        'First activation argument must be "app" (JupyterFrontEnd), got "{{ arg }}".',
      wrongArgumentCount:
        'Expected {{ expected }} activation arguments (app + {{ tokenCount }} tokens), got {{ actual }}.'
    },
    fixable: 'code',
    schema: []
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      VariableDeclarator(node: ESTree.Node) {
        const varDecl = node as ESTree.VariableDeclarator;

        if (!hasJupyterPluginType(varDecl)) {
          return;
        }

        if (varDecl.init && varDecl.init.type === 'ObjectExpression') {
          const pluginObj = varDecl.init as ESTree.ObjectExpression;

          const { requires, optional } = extractRequiresOptional(pluginObj);

          const activateInfo = findActivateFunction(pluginObj);
          if (!activateInfo) {
            return;
          }
          const { params, paramTypes } = activateInfo;

          const expectedCount = 1 + requires.length + optional.length;
          const expectedTokensWithoutApp = [...requires, ...optional];

          // Validation 1: Check if first argument is 'app'
          if (params.length > 0 && params[0] !== 'app') {
            context.report({
              node: activateInfo.node,
              messageId: 'appNotFirst',
              data: { arg: params[0] }
            });
            // Skip further as the structure is fundamentally wrong
            return;
          }

          // Validation 2: Check if argument count matches
          if (params.length !== expectedCount) {
            context.report({
              node: activateInfo.node,
              messageId: 'wrongArgumentCount',
              data: {
                expected: String(expectedCount),
                tokenCount: String(requires.length + optional.length),
                actual: String(params.length)
              }
            });
          }

          // Validation 3: If parameters have type annotations, validate order
          const actualParamTypes = paramTypes.slice(1); // Skip 'app'
          const hasTypeInfo = actualParamTypes.some(
            (t: string | null) => t !== null
          );

          if (hasTypeInfo) {
            // Validate that parameter types match expected token types in order
            for (let i = 0; i < actualParamTypes.length; i++) {
              const paramType = actualParamTypes[i];
              const expectedToken = expectedTokensWithoutApp[i];

              if (expectedToken === undefined) {
                // Extra argument
                if (paramType) {
                  context.report({
                    node: activateInfo.node,
                    messageId: 'extraArgument',
                    data: { arg: params[i + 1] }
                  });
                }
              } else if (paramType !== null && paramType !== expectedToken) {
                // Type mismatch
                context.report({
                  node: activateInfo.node,
                  messageId: 'mismatchedOrder',
                  data: { arg: params[i + 1] }
                });
              }
            }
          } else {
            // Without type information, we only check for extra arguments
            const actualParams = params.slice(1);
            for (
              let i = expectedTokensWithoutApp.length;
              i < actualParams.length;
              i++
            ) {
              context.report({
                node: activateInfo.node,
                messageId: 'extraArgument',
                data: { arg: actualParams[i] }
              });
            }
          }

          // Validation 4: Check for missing arguments (only if counts don't match)
          if (params.length < expectedCount) {
            for (
              let i = params.length - 1;
              i < expectedTokensWithoutApp.length;
              i++
            ) {
              const missingToken = expectedTokensWithoutApp[i];
              context.report({
                node: activateInfo.node,
                messageId: 'missingArgument',
                data: { token: missingToken }
              });
            }
          }
        }
      }
    };
  }
};

export = jupyterPluginActivationArgs;
