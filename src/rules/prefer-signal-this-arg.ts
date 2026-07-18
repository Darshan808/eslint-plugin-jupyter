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
  getEnclosingClass,
  isConnectCall,
  isDisposedSignalWiring,
  looksLikeSignalByName,
  resolveUnboundThisMethodConnect
} from '../utils/signals';

const preferSignalThisArg = createRule({
  name: 'prefer-signal-this-arg',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Prefer passing a thisArg when connecting to a Lumino signal so the connection can be cleaned up',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/prefer-signal-this-arg/'
    },
    messages: {
      preferThisArg:
        'Signal connected without a thisArg. Without a receiver, "Signal.clearData(this)" and "disconnect(callback, this)" cannot remove this connection, so it may leak when this object is discarded. Pass "this" as the second argument to connect().',
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

        if (!getEnclosingClass(node)) {
          // No `this` to pass; module scope and plugin activate() functions
          // are app-lifetime connections anyway.
          return;
        }

        if (isDisposedSignalWiring(node)) {
          // `x.disposed.connect(() => ...)` is the disposal-wiring idiom:
          // the sender is torn down right as it fires, so the connection is
          // cleaned up sender-side.
          return;
        }

        if (resolveUnboundThisMethodConnect(node)) {
          // A bare method reference that uses `this` is a runtime bug, not
          // just a cleanup concern — reported at error level by
          // require-signal-this-arg instead.
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

        const callback = node.arguments[0];
        context.report({
          node: callback,
          messageId: 'preferThisArg',
          suggest: [
            {
              messageId: 'addThisArg',
              fix: fixer => fixer.insertTextAfter(callback, ', this')
            }
          ]
        });
      }
    };
  }
});

export = preferSignalThisArg;
