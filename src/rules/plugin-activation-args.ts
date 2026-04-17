/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import {
  getJupyterPluginKind,
  extractParameterType,
  extractArrayTokens,
  TokenEntry
} from '../utils/plugin-utils';
import { createRule } from '../utils/create-rule';

interface ActivateFunctionInfo {
  node: TSESTree.Node;
  paramNames: string[];
  paramTypes: (string | null)[];
  paramNodes: (TSESTree.Identifier | null)[];
}

interface RequiresOptionalInfo {
  requires: TokenEntry[];
  optional: TokenEntry[];
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

    const paramNames = params.map(param => param.name);

    const paramTypes = params.map(param =>
      param.type === 'Identifier' ? extractParameterType(param) : null
    );

    const paramNodes = params.map(param =>
      param.type === 'Identifier' ? param : null
    );

    return {
      node: activateProp,
      paramNames,
      paramTypes,
      paramNodes
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
      result.requires = extractArrayTokens(prop.value);
    } else if (
      keyName === 'optional' &&
      prop.value.type === 'ArrayExpression'
    ) {
      result.optional = extractArrayTokens(prop.value);
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

const jupyterPluginActivationArgs = createRule({
  name: 'plugin-activation-args',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/plugin-activation-args/'
    },
    messages: {
      mismatchedOrder:
        'Activation argument "{{ arg }}" does not match the order of requires/optional tokens.',
      incorrectType:
        'Activation argument "{{ arg }}" has incorrect type annotation "{{ type }}". Expected type "{{ expected }}".',
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
        'Expected {{ expected }} activation arguments (app + {{ tokenCount }} tokens), got {{ actual }}.',
      unresolvableTokenType:
        'Token "{{ token }}" type could not be resolved. The package may be unbuilt or type checking may not be configured.'
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
  defaultOptions: [
    {
      allowedFirstArgumentNames: DEFAULT_ALLOWED_FIRST_ARGUMENT_NAMES
    }
  ],

  create(context, [options]) {
    const allowedFirstArgumentNames: string[] =
      options.allowedFirstArgumentNames || DEFAULT_ALLOWED_FIRST_ARGUMENT_NAMES;

    // Try to obtain the TypeScript type checker for type-aware comparisons.
    let services: ParserServices | null = null;
    let checker: ts.TypeChecker | null = null;

    try {
      services = ESLintUtils.getParserServices(context, true);
      checker = services.program ? services.program.getTypeChecker() : null;
    } catch {
      // Parser services unavailable (e.g., non-TS file or misconfigured parser)
      services = null;
    }

    /**
     * Given the AST node for a token in requires/optional, uses the TypeScript checker to extract T from
     * `Token<T>` and returns the TypeScript type object for T.
     * Returns null when type information is unavailable or extraction fails.
     */
    function resolveTokenInnerType(tokenNode: TSESTree.Node): ts.Type | null {
      if (!checker) {
        return null;
      }
      try {
        const tsNode = services?.esTreeNodeToTSNodeMap.get(tokenNode);
        if (!tsNode) {
          return null;
        }
        const tokenType = checker.getTypeAtLocation(tsNode);
        const typeArgs = checker.getTypeArguments(
          tokenType as ts.TypeReference
        );
        if (typeArgs && typeArgs.length > 0) {
          return typeArgs[0];
        }
      } catch {
        // Fall through
      }
      return null;
    }

    /**
     * Given the AST node for an activate parameter identifier, uses the
     * TypeScript checker to get its type.
     * Returns null when type information is unavailable or extraction fails.
     */
    function resolveParamType(paramNode: TSESTree.Identifier): ts.Type | null {
      if (!checker) return null;
      try {
        const tsNode = services?.esTreeNodeToTSNodeMap.get(paramNode);
        if (!tsNode) return null;
        const type = checker.getTypeAtLocation(tsNode);
        // Handle `T | null/undefined` (optional token pattern)
        if (type.isUnion()) {
          const nonNullTypes = type.types.filter(
            t =>
              !(t.flags & ts.TypeFlags.Null) &&
              !(t.flags & ts.TypeFlags.Undefined)
          );
          if (nonNullTypes.length === 1) {
            return nonNullTypes[0];
          }
        }
        return type;
      } catch {
        // Fall through
      }
      return null;
    }

    /**
     * Returns true when two TypeScript types refer to the same type.
     */
    function isSameType(a: ts.Type, b: ts.Type): boolean {
      if (a === b) return true;
      if (a.symbol && b.symbol && a.symbol === b.symbol) return true;
      return checker!.typeToString(a) === checker!.typeToString(b);
    }

    /**
     * Returns [matches, tokenUnresolved] where:
     * - matches: true when the activate parameter type is compatible with the token's type.
     * - tokenUnresolved: true when the token's inner type could not be resolved (null, undefined, or any),
     *   meaning the result is inconclusive (e.g. package is unbuilt).
     */
    function tokenMatchesParam(
      token: TokenEntry,
      paramType: string | null,
      paramNode: TSESTree.Identifier | null
    ): [boolean, boolean] {
      // For most cases this check is sufficient
      if (paramType === token.name) return [true, false];
      // Without a checker we cannot resolve namespace patterns like
      // `IDebugger.ISidebar` ↔ `IDebuggerSidebar`, so we cannot distinguish
      // a genuine mismatch from a valid aliasing convention.
      // Users wanting full type-aware checks should configure
      // `parserOptions.project`.
      if (!checker) return [false, true];
      if (paramNode) {
        const resolvedToken = resolveTokenInnerType(token.node);
        const tokenUnresolved =
          resolvedToken === null ||
          resolvedToken === undefined ||
          !!(resolvedToken.flags & ts.TypeFlags.Any);
        if (tokenUnresolved) {
          return [true, true];
        }
        const resolvedParam = resolveParamType(paramNode);
        if (resolvedParam !== null) {
          return [isSameType(resolvedToken, resolvedParam), false];
        }
      }
      return [false, false];
    }

    return {
      VariableDeclarator(node) {
        const pluginKind = getJupyterPluginKind(node);
        if (!pluginKind) {
          return;
        }

        if (node.init && node.init.type === 'ObjectExpression') {
          const pluginObj = node.init;

          const { requires, optional } = extractRequiresOptional(pluginObj);

          const activateInfo = findActivateFunction(pluginObj);
          if (!activateInfo) {
            return;
          }
          const { paramNames, paramTypes, paramNodes } = activateInfo;

          const expectedCount = 1 + requires.length + optional.length;
          const expectedTokensWithoutApp = [...requires, ...optional];

          if (expectedCount === 1 && paramNames.length === 0) {
            // Special case, not invalid
            return;
          }

          if (pluginKind === 'frontend') {
            // Validation 1a: Check if first argument is one of the allowed names
            if (
              paramNames.length > 0 &&
              !allowedFirstArgumentNames.includes(paramNames[0])
            ) {
              context.report({
                node: activateInfo.node,
                messageId: 'appNotFirst',
                data: {
                  arg: paramNames[0],
                  allowedNames: allowedFirstArgumentNames
                    .map(name => `"${name}"`)
                    .join(', ')
                }
              });
              return;
            }

            // Validation 1b: Check if first argument type is compatible with JupyterFrontEnd
            if (paramNames.length > 0 && paramTypes.length > 0) {
              const firstParamType = paramTypes[0];
              if (!isCompatibleWithJupyterFrontEnd(firstParamType)) {
                context.report({
                  node: activateInfo.node,
                  messageId: 'invalidAppType',
                  data: {
                    arg: paramNames[0],
                    type: firstParamType || 'unknown'
                  }
                });
                return;
              }
            }
          } else if (pluginKind === 'service-manager') {
            // Validation 1: First argument must be literal null
            if (paramNames.length === 0 || paramTypes[0] !== null) {
              context.report({
                node: activateInfo.node,
                messageId: 'serviceManagerFirstArgNotNull',
                data: {
                  arg: paramTypes[0]
                }
              });
              return;
            }
          }

          // Validation 2: Check if argument count matches
          if (paramNames.length !== expectedCount) {
            context.report({
              node: activateInfo.node,
              messageId: 'wrongArgumentCount',
              data: {
                expected: String(expectedCount),
                tokenCount: String(requires.length + optional.length),
                actual: String(paramNames.length)
              }
            });
          }

          // Validation 3: Validate remaining parameters against expected token order
          const actualParamTypes = paramTypes.slice(1); // First arg already validated above
          const actualParamNodes = paramNodes.slice(1);

          // Validate that parameter types match expected token types in order
          for (let i = 0; i < actualParamTypes.length; i++) {
            const paramType = actualParamTypes[i];
            const paramNode = actualParamNodes[i];
            const expectedToken = expectedTokensWithoutApp[i];

            if (expectedToken === undefined) {
              // Extra argument
              context.report({
                node: activateInfo.node,
                messageId: 'extraArgument',
                data: { arg: paramNames[i + 1] }
              });
            } else {
              const [matches, tokenUnresolved] = tokenMatchesParam(
                expectedToken,
                paramType,
                paramNode
              );
              if (tokenUnresolved) {
                context.report({
                  node: activateInfo.node,
                  messageId: 'unresolvableTokenType',
                  data: { token: expectedToken.name }
                });
              } else if (!matches) {
                // Distinguish token-order conflict vs. invalid type annotation.
                const matchesAnyOtherToken = expectedTokensWithoutApp.some(
                  (otherToken, j) => {
                    if (j === i) return false;
                    const [otherMatches, tokenUnresolved] = tokenMatchesParam(
                      otherToken,
                      paramType,
                      paramNode
                    );
                    return otherMatches && !tokenUnresolved;
                  }
                );
                if (matchesAnyOtherToken) {
                  context.report({
                    node: activateInfo.node,
                    messageId: 'mismatchedOrder',
                    data: { arg: paramNames[i + 1] }
                  });
                } else {
                  context.report({
                    node: activateInfo.node,
                    messageId: 'incorrectType',
                    data: {
                      arg: paramNames[i + 1],
                      type: paramType,
                      expected: expectedToken.name
                    }
                  });
                }
              }
            }
          }

          // Validation 4: Check for missing arguments (only if counts don't match)
          if (paramNames.length < expectedCount) {
            for (
              let i = Math.max(paramNames.length - 1, 0);
              i < expectedTokensWithoutApp.length;
              i++
            ) {
              const missingToken = expectedTokensWithoutApp[i];
              context.report({
                node: activateInfo.node,
                messageId: 'missingArgument',
                data: { token: missingToken.name }
              });
            }
          }
        }
      }
    };
  }
});

export = jupyterPluginActivationArgs;
