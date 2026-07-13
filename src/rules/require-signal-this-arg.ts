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
  isStaticContext,
  looksLikeSignalByName,
  methodUsesThis,
  resolveClassMember
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
        const arg = node.arguments[0];
        if (
          arg.type !== 'MemberExpression' ||
          arg.object.type !== 'ThisExpression' ||
          arg.computed
        ) {
          return;
        }
        const property = arg.property;
        if (
          property.type !== 'Identifier' &&
          property.type !== 'PrivateIdentifier'
        ) {
          return;
        }
        const isPrivate = property.type === 'PrivateIdentifier';
        const name = property.name;

        const enclosingClass = getEnclosingClass(node);
        if (!enclosingClass) {
          return;
        }

        const member = resolveClassMember(enclosingClass, name, {
          isPrivate,
          isStatic: isStaticContext(node)
        });
        if (!member) {
          // Not found in this class (possibly inherited) — skip conservatively.
          return;
        }

        let fn: TSESTree.FunctionExpression;
        if (member.type === 'PropertyDefinition') {
          if (!member.value || member.value.type !== 'FunctionExpression') {
            // Arrow-function properties are lexically bound and safe; other
            // values are not resolvable callbacks.
            return;
          }
          fn = member.value;
        } else {
          if (member.kind !== 'method') {
            // Getters/setters are evaluated, not referenced — out of scope.
            return;
          }
          if (member.value.type !== 'FunctionExpression') {
            // Abstract or overload signature — no body to inspect.
            return;
          }
          fn = member.value;
        }

        if (!methodUsesThis(fn)) {
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
          node: arg,
          messageId: 'missingThisArg',
          data: { name: isPrivate ? `#${name}` : name },
          suggest: [
            {
              messageId: 'addThisArg',
              fix: fixer => fixer.insertTextAfter(arg, ', this')
            }
          ]
        });
      }
    };
  }
});

export = requireSignalThisArg;
