/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { createRule } from '../utils/create-rule';
import {
  classifySignalReceiver,
  isConnectCall,
  looksLikeSignalByName,
  resolveUnboundThisMethodConnect
} from '../utils/signals';

const requireSignalThisArg = createRule({
  name: 'require-signal-this-arg',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Require a thisArg when connecting a class method that references `this` to a Lumino signal',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/require-signal-this-arg/'
    },
    messages: {
      missingThisArg:
        'Callback "{{ name }}" references "this" but is connected without a thisArg, so "this" will not be bound to this instance when the signal fires. Pass "this" as the second argument to connect().',
      addThisArg: 'Add "this" as the second argument'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    let services: ParserServices | null = null;
    let checker: ts.TypeChecker | null = null;

    try {
      services = ESLintUtils.getParserServices(context, true);
      checker = services.program ? services.program.getTypeChecker() : null;
    } catch {
      services = null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        if (!isConnectCall(node) || node.arguments.length !== 1) {
          return;
        }

        const unbound = resolveUnboundThisMethodConnect(node);
        if (!unbound) {
          // Any other callback shape has no runtime `this` bug; the
          // warning-level prefer-signal-this-arg rule covers those.
          return;
        }

        const classification = classifySignalReceiver(
          node.callee.object,
          checker,
          services
        );
        if (classification === 'not-signal') {
          return;
        }
        if (
          classification === 'unknown' &&
          !looksLikeSignalByName(node.callee.object)
        ) {
          // Single-argument `.connect(callback)` is a weak signature shared
          // by many non-Lumino APIs — without type information, require a
          // conventional signal name before flagging.
          return;
        }

        context.report({
          node: unbound.arg,
          messageId: 'missingThisArg',
          data: {
            name: unbound.isPrivate ? `#${unbound.name}` : unbound.name
          },
          suggest: [
            {
              messageId: 'addThisArg',
              fix: fixer => fixer.insertTextAfter(unbound.arg, ', this')
            }
          ]
        });
      }
    };
  }
});

export = requireSignalThisArg;
