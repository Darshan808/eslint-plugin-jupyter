/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';

const TRANS_METHOD = '__';

/**
 * Returns true when every leaf of a `+` expression tree is a string literal.
 * Such concatenation is static and translation tools can handle it.
 */
function isAllStringLiterals(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'string';
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isAllStringLiterals(node.left) && isAllStringLiterals(node.right);
  }
  return false;
}

/**
 * Returns the first `+` BinaryExpression found anywhere in the subtree that
 * involves a non-literal operand, or null if none exists.
 */
function findConcatenation(
  node: TSESTree.Node
): TSESTree.BinaryExpression | null {
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isAllStringLiterals(node) ? null : node;
  }
  const record = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === 'type' || key === 'loc' || key === 'range' || key === 'parent') {
      continue;
    }
    const child = record[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof (item as TSESTree.Node).type === 'string') {
            const found = findConcatenation(item as TSESTree.Node);
            if (found) return found;
          }
        }
      } else if (typeof (child as TSESTree.Node).type === 'string') {
        const found = findConcatenation(child as TSESTree.Node);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Returns true if the node is a recognized JupyterLab translation bundle:
 * trans | this.trans | this._trans | props.trans | this.props.trans
 * See jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules
 */
function isTransBundle(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === 'trans';
  }

  if (node.type === 'MemberExpression' && !node.computed) {
    const prop = node.property;
    if (prop.type !== 'Identifier') {
      return false;
    }

    // this.trans / this._trans
    if (node.object.type === 'ThisExpression') {
      return prop.name === 'trans' || prop.name === '_trans';
    }

    // props.trans
    if (
      prop.name === 'trans' &&
      node.object.type === 'Identifier' &&
      node.object.name === 'props'
    ) {
      return true;
    }

    // this.props.trans
    if (
      prop.name === 'trans' &&
      node.object.type === 'MemberExpression' &&
      !node.object.computed &&
      node.object.object.type === 'ThisExpression' &&
      node.object.property.type === 'Identifier' &&
      node.object.property.name === 'props'
    ) {
      return true;
    }
  }

  return false;
}

const noTranslationConcatenation = createRule({
  name: 'no-translation-concatenation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid string concatenation inside translation wrapper calls',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-translation-concatenation/'
    },
    messages: {
      noConcatenation:
        'Do not use string concatenation inside translation wrappers. Use a placeholder instead, e.g. trans.__("Hello %1", name).'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') {
          return;
        }
        const callee = node.callee;
        if (callee.computed || callee.property.type !== 'Identifier') {
          return;
        }
        if (callee.property.name !== TRANS_METHOD) {
          return;
        }
        if (!isTransBundle(callee.object)) {
          return;
        }

        const message = node.arguments[0];
        if (!message) {
          return;
        }
        const concat = findConcatenation(message);
        if (concat) {
          context.report({ node: concat, messageId: 'noConcatenation' });
        }
      }
    };
  }
});

export = noTranslationConcatenation;
