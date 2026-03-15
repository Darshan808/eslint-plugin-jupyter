/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/types';
import {
  getJupyterPluginKind,
  extractParameterType,
  extractArrayElements
} from '../utils/plugin-utils';

interface ActivateFunctionInfo {
  node: TSESTree.Node;
  params: string[];
  paramTypes: (string | null)[];
}

interface RequiresOptionalInfo {
  requires: string[];
  optional: string[];
}

const DEFAULT_ALLOWED_FIRST_ARGUMENT_NAMES = ['app', '_app', '_'];

/**
 * Finds the activate function in the plugin object
 */
function findActivateFunction(
  node: TSESTree.ObjectExpression
): ActivateFunctionInfo | null {
  const activateProp = node.properties.find(
    (prop): prop is TSESTree.Property =>
      prop.type === 'Property' &&
      ((prop.key.type === 'Identifier' && prop.key.name === 'activate') ||
        (prop.key.type === 'Literal' && prop.key.value === 'activate'))
  );

  if (!activateProp) {
    return null;
  }

  const activateValue = activateProp.value;

  // Handle both arrow functions and regular functions
  if (
    activateValue.type === 'ArrowFunctionExpression' ||
    activateValue.type === 'FunctionExpression'
  ) {
    const params = activateValue.params
      .filter(
        (param): param is TSESTree.Identifier => param.type === 'Identifier'
      )
      .map(param => param.name);

    const paramTypes = activateValue.params.map(param =>
      param.type === 'Identifier' ? extractParameterType(param) : null
    );

    return {
      node: activateProp,
      params,
      paramTypes
    };
  }

  return null;
}

/**
 * Extracts requires and optional arrays from a plugin object
 */
function extractRequiresOptional(
  node: TSESTree.ObjectExpression
): RequiresOptionalInfo {
  const result: RequiresOptionalInfo = {
    requires: [],
    optional: []
  };

  for (const prop of node.properties) {
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
      result.requires = extractArrayElements(prop.value);
    } else if (
      keyName === 'optional' &&
      prop.value.type === 'ArrayExpression'
    ) {
      result.optional = extractArrayElements(prop.value);
    }
  }

  return result;
}

/**
 * Checks if a type name is compatible with JupyterFrontEnd
 */
function isCompatibleWithJupyterFrontEnd(typeName: string | null): boolean {
  if (!typeName) {
    return true; // If we can't check, we allow it
  }

  const compatibleTypes = ['JupyterFrontEnd', 'JupyterLab', 'Application'];

  return compatibleTypes.includes(typeName);
}

const jupyterPluginActivationArgs: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order',
      recommended: 'recommended',
      url: 'https://github.com/jupyterlab/eslint-plugin'
    },
    messages: {
      mismatchedOrder:
        'Activation argument "{{ arg }}" does not match the order of requires/optional tokens.',
      missingArgument:
        'Token "{{ token }}" from requires/optional is missing in activation arguments.',
      extraArgument:
        'Activation argument "{{ arg }}" is not in requires/optional tokens.',
      appNotFirst:
        'First activation argument must be one of [{{ allowedNames }}] (JupyterFrontEnd), got "{{ arg }}".',
      serviceManagerFirstArgNotNull:
        'First activation argument for ServiceManagerPlugin must be null, got "{{ arg }}".',
      invalidAppType:
        'First activation argument "{{ arg }}" has invalid type "{{ type }}". Expected JupyterFrontEnd, JupyterLab, or Application.',
      wrongArgumentCount:
        'Expected {{ expected }} activation arguments (app + {{ tokenCount }} tokens), got {{ actual }}.'
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowedFirstArgumentNames: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: DEFAULT_ALLOWED_FIRST_ARGUMENT_NAMES,
            description:
              'Allowed names for the first activation argument (JupyterFrontEnd)'
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    // Get configuration options
    const options = context.options[0] || {};
    const allowedFirstArgumentNames: string[] =
      options.allowedFirstArgumentNames || DEFAULT_ALLOWED_FIRST_ARGUMENT_NAMES;

    return {
      VariableDeclarator(node: Rule.Node) {
        const varDecl = node as TSESTree.VariableDeclarator;

        const pluginKind = getJupyterPluginKind(varDecl);
        if (!pluginKind) {
          return;
        }

        if (varDecl.init && varDecl.init.type === 'ObjectExpression') {
          const pluginObj = varDecl.init;

          const { requires, optional } = extractRequiresOptional(pluginObj);

          const activateInfo = findActivateFunction(pluginObj);
          if (!activateInfo) {
            return;
          }
          const { params, paramTypes } = activateInfo;

          const expectedCount = 1 + requires.length + optional.length;
          const expectedTokensWithoutApp = [...requires, ...optional];

          if (expectedCount === 1 && params.length === 0) {
            // Special case, not invalid
            return;
          }

          if (pluginKind === 'frontend') {
            // Validation 1a: Check if first argument is one of the allowed names
            if (
              params.length > 0 &&
              !allowedFirstArgumentNames.includes(params[0])
            ) {
              context.report({
                node: activateInfo.node,
                messageId: 'appNotFirst',
                data: {
                  arg: params[0],
                  allowedNames: allowedFirstArgumentNames
                    .map(name => `"${name}"`)
                    .join(', ')
                }
              });
              return;
            }

            // Validation 1b: Check if first argument type is compatible with JupyterFrontEnd
            if (params.length > 0 && paramTypes.length > 0) {
              const firstParamType = paramTypes[0];
              if (!isCompatibleWithJupyterFrontEnd(firstParamType)) {
                context.report({
                  node: activateInfo.node,
                  messageId: 'invalidAppType',
                  data: {
                    arg: params[0],
                    type: firstParamType || 'unknown'
                  }
                });
                return;
              }
            }
          } else if (pluginKind === 'service-manager') {
            // Validation 1: First argument must be literal null
            if (params.length === 0 || paramTypes[0] !== null) {
              const firstArg = params[0] ?? 'missing';
              context.report({
                node: activateInfo.node,
                messageId: 'serviceManagerFirstArgNotNull',
                data: {
                  arg: firstArg
                }
              });
              return;
            }
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
          const actualParamTypes = paramTypes.slice(1); // First arg already validated above
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
              } else if (paramType !== expectedToken) {
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
              let i = Math.max(params.length - 1, 0);
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
