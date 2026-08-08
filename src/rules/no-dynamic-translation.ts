/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';
import {
  BUNDLE_METHODS,
  STATIC_ARGUMENT_INDICES,
  isTransBundle,
  unwrapExpression
} from '../utils/translation';

type MessageId = 'noInterpolation' | 'noDynamicMessage';

/**
 * Returns true when the message is written out at the call site, so the string
 * extractor can read it straight from the source: a quoted string, or a
 * template literal with nothing interpolated into it.
 *
 * The extractor reads the call site and nothing else — it never follows a
 * variable to its definition — so anything else leaves it with no message to
 * extract, however static the value may be at runtime.
 */
function isStaticString(node: TSESTree.Node): boolean {
  const expression = unwrapExpression(node);
  if (expression.type === 'Literal') {
    return typeof expression.value === 'string';
  }
  if (expression.type === 'TemplateLiteral') {
    return expression.expressions.length === 0;
  }
  return false;
}

/**
 * Returns true for a `+` expression. Concatenation is the concern of the
 * `no-translation-concatenation` rule, so this rule leaves it alone rather than
 * reporting the same line twice.
 */
function isConcatenation(node: TSESTree.Node): boolean {
  const expression = unwrapExpression(node);
  return expression.type === 'BinaryExpression' && expression.operator === '+';
}

/**
 * Picks the message that best explains why an argument is not extractable.
 */
function getMessageId(node: TSESTree.Node): MessageId {
  return unwrapExpression(node).type === 'TemplateLiteral'
    ? 'noInterpolation'
    : 'noDynamicMessage';
}

const noDynamicTranslation = createRule({
  name: 'no-dynamic-translation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require translation messages to be written as literals at the call site',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-dynamic-translation/'
    },
    messages: {
      noInterpolation:
        'Do not interpolate values into translation strings. Use a placeholder instead, e.g. trans.__("Delete %1", fileName).',
      noDynamicMessage:
        'Write the translation string as a literal in the call itself. e.g. trans.__("Kernel %1", status).'
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
        const method = callee.property.name;
        if (!BUNDLE_METHODS.has(method)) {
          return;
        }
        if (!isTransBundle(callee.object)) {
          return;
        }

        for (const index of STATIC_ARGUMENT_INDICES[method]) {
          const argument = node.arguments[index];
          if (!argument || isConcatenation(argument)) {
            continue;
          }
          if (!isStaticString(argument)) {
            context.report({
              node: argument,
              messageId: getMessageId(argument)
            });
          }
        }
      }
    };
  }
});

export = noDynamicTranslation;
