/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';

type MessageIds = 'requireSoftAssertion';
type Options = [];

interface SnapshotCall {
  node: TSESTree.CallExpression;
  isSoft: boolean;
}

function isTestBlock(node: TSESTree.CallExpression): boolean {
  const { callee } = node;
  if (callee.type === 'Identifier') {
    return callee.name === 'test' || callee.name === 'it';
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    (callee.object.name === 'test' || callee.object.name === 'it') &&
    callee.property.type === 'Identifier'
  ) {
    return true;
  }
  return false;
}

function getSnapshotInfo(
  node: TSESTree.CallExpression
): { isSoft: boolean } | null {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed) return null;

  const prop = callee.property;
  if (prop.type !== 'Identifier' || prop.name !== 'toMatchSnapshot') {
    return null;
  }

  const expectCall = callee.object;
  if (expectCall.type !== 'CallExpression') return null;

  const expectCallee = expectCall.callee;

  if (expectCallee.type === 'Identifier' && expectCallee.name === 'expect') {
    return { isSoft: false };
  }

  if (
    expectCallee.type === 'MemberExpression' &&
    !expectCallee.computed &&
    expectCallee.object.type === 'Identifier' &&
    expectCallee.object.name === 'expect' &&
    expectCallee.property.type === 'Identifier' &&
    expectCallee.property.name === 'soft'
  ) {
    return { isSoft: true };
  }

  return null;
}

const requireSoftAssertionsBeforeSnapshots = createRule<Options, MessageIds>({
  name: 'require-soft-assertions-before-snapshots',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require expect.soft() for snapshot assertions that precede other snapshot assertions in the same test block'
    },
    messages: {
      requireSoftAssertion:
        'Use expect.soft() for snapshot assertions that are not the last in the test block. Hard assertions short-circuit on failure, preventing subsequent snapshots from being updated.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const testContextStack: SnapshotCall[][] = [];

    return {
      CallExpression(node) {
        if (isTestBlock(node)) {
          testContextStack.push([]);
          return;
        }

        const info = getSnapshotInfo(node);
        if (info && testContextStack.length > 0) {
          testContextStack[testContextStack.length - 1].push({
            node,
            isSoft: info.isSoft
          });
        }
      },

      'CallExpression:exit'(node) {
        if (!isTestBlock(node)) return;

        const snapshots = testContextStack.pop();
        if (!snapshots || snapshots.length <= 1) return;

        for (let i = 0; i < snapshots.length - 1; i++) {
          if (!snapshots[i].isSoft) {
            context.report({
              node: snapshots[i].node,
              messageId: 'requireSoftAssertion'
            });
          }
        }
      }
    };
  }
});

export = requireSoftAssertionsBeforeSnapshots;
