/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';

/**
 * Token symbol (part after the first ':') must be a valid JavaScript identifier.
 */
const VALID_TOKEN_SYMBOL = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

const tokenFormat = createRule({
  name: 'token-format',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure JupyterLab Token ids follow the <package>:<TokenSymbol> naming convention',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/token-format/'
    },
    messages: {
      missingColon:
        'Token id "{{ tokenId }}" must follow the format "<package>:<TokenSymbol>" (no colon found).',
      invalidTokenSymbol:
        'Token id "{{ tokenId }}" has an invalid symbol "{{ symbol }}". ' +
        'The part after ":" must be a valid JavaScript identifier.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      NewExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'Token'
        ) {
          return;
        }

        if (node.arguments.length === 0) {
          return;
        }

        const firstArg = node.arguments[0];

        if (firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') {
          return;
        }

        const tokenId: string = firstArg.value;
        const colonIndex = tokenId.indexOf(':');

        if (colonIndex === -1) {
          context.report({
            node: firstArg,
            messageId: 'missingColon',
            data: { tokenId }
          });
          return;
        }

        const symbol = tokenId.slice(colonIndex + 1);

        if (!VALID_TOKEN_SYMBOL.test(symbol)) {
          context.report({
            node: firstArg,
            messageId: 'invalidTokenSymbol',
            data: { tokenId, symbol }
          });
        }
      }
    };
  }
});

export = tokenFormat;
