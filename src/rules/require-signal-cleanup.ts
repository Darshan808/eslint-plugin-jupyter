/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { createRule } from '../utils/create-rule';
import {
  classHasCleanupEvidence,
  classifySignalReceiver,
  collectSignalNamespaceLocalNames,
  getEnclosingClass,
  isConnectCall
} from '../utils/signals';

const requireSignalCleanup = createRule({
  name: 'require-signal-cleanup',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require classes that connect to Lumino signals with `this` as the receiver to show a cleanup path',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/require-signal-cleanup/'
    },
    messages: {
      missingSignalCleanup:
        'Signal connected with "this" as the receiver, but this class shows no cleanup path (Signal.clearData(this), a ".disconnect()" call, consuming the connect() return value, or ".disposed.connect()" wiring). The connection can outlive the object and leak or fire after disposal.'
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalCleanupMethods: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: [],
            description:
              'Additional method names (besides "disconnect") that count as cleanup evidence when called anywhere in the class'
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    {
      additionalCleanupMethods: [] as string[]
    }
  ],

  create(context, [options]) {
    const additionalCleanupMethods: string[] =
      options.additionalCleanupMethods || [];

    let services: ParserServices | null = null;
    let checker: ts.TypeChecker | null = null;

    try {
      services = ESLintUtils.getParserServices(context, true);
      checker = services.program ? services.program.getTypeChecker() : null;
    } catch {
      services = null;
    }

    let signalLocalNames: ReadonlySet<string> = new Set(['Signal']);
    // Classes already scanned for cleanup evidence in this file.
    const cleanupEvidenceCache = new Map<TSESTree.Node, boolean>();

    return {
      Program(node: TSESTree.Program): void {
        signalLocalNames = collectSignalNamespaceLocalNames(node);
        cleanupEvidenceCache.clear();
      },

      CallExpression(node: TSESTree.CallExpression): void {
        if (!isConnectCall(node)) {
          return;
        }
        if (node.arguments.length < 2) {
          // No thisArg, there is no receiver object to trace cleanup for.
          return;
        }
        if (node.arguments[1].type !== 'ThisExpression') {
          // Receiver is some other object; its lifecycle is not traceable
          // from this class.
          return;
        }

        const enclosingClass = getEnclosingClass(node);
        if (!enclosingClass) {
          return;
        }
        if (enclosingClass.superClass) {
          // A base class such as Lumino's Widget may already clean up via
          // its inherited dispose()
          return;
        }

        let hasEvidence = cleanupEvidenceCache.get(enclosingClass);
        if (hasEvidence === undefined) {
          hasEvidence = classHasCleanupEvidence(
            enclosingClass,
            signalLocalNames,
            additionalCleanupMethods
          );
          cleanupEvidenceCache.set(enclosingClass, hasEvidence);
        }
        if (hasEvidence) {
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
        // 'signal' and 'unknown' both flag: a 2-argument
        // `.connect(callback, this)` call is a distinctive Lumino signature
        // even when the receiver type cannot be resolved.

        context.report({
          node,
          messageId: 'missingSignalCleanup'
        });
      }
    };
  }
});

export = requireSignalCleanup;
