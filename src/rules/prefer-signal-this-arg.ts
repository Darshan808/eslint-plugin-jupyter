/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { createRule } from '../utils/create-rule';
import {
  classExtendsLuminoWidget,
  classHasMatchingBareDisconnect,
  classUsesReceiverBasedCleanup,
  classifySignalReceiver,
  collectSignalNamespaceLocalNames,
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
        'Pass a thisArg when connecting to a Lumino signal in a class that cleans up with Signal.clearData(this) or disconnect(callback, this)',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/prefer-signal-this-arg/'
    },
    messages: {
      preferThisArg:
        'This class relies on receiver-based signal cleanup ("Signal.clearData(this)" or "disconnect(callback, this)"), but this connection is registered without a thisArg, so that cleanup cannot remove it and it can leak. Pass "this" as the second argument to connect().',
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

    let signalLocalNames: ReadonlySet<string> = new Set(['Signal']);
    // Per-class scan results, cached for the file.
    const receiverCleanupCache = new Map<TSESTree.Node, boolean>();

    return {
      Program(node: TSESTree.Program): void {
        signalLocalNames = collectSignalNamespaceLocalNames(node);
        receiverCleanupCache.clear();
      },

      CallExpression(node: TSESTree.CallExpression): void {
        if (!isConnectCall(node) || node.arguments.length !== 1) {
          return;
        }

        const enclosingClass = getEnclosingClass(node);
        if (!enclosingClass) {
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

        const callback = node.arguments[0];
        if (classHasMatchingBareDisconnect(enclosingClass, callback)) {
          // Lumino matches connections by exact (signal, slot, thisArg), so
          // a paired one-argument disconnect(callback) is a working teardown
          // that adding `, this` here would silently break.
          return;
        }

        let relies = receiverCleanupCache.get(enclosingClass);
        if (relies === undefined) {
          relies =
            classUsesReceiverBasedCleanup(enclosingClass, signalLocalNames) ||
            classExtendsLuminoWidget(enclosingClass, checker, services);
          receiverCleanupCache.set(enclosingClass, relies);
        }
        if (!relies) {
          // Only classes that clean up by receiver — their own
          // Signal.clearData(this) / disconnect(x, this), or an inherited
          // Lumino Widget.dispose() — need connections registered with a
          // thisArg. Elsewhere, adding one changes disconnect matching for
          // no benefit.
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
