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

/**
 * Returns true when the expression is text the string extractor can read
 * straight from the source: a quoted string, a template literal with nothing
 * interpolated into it, or a `+` tree of those.
 *
 * Concatenating literals is only ever a source-formatting choice — the
 * extractor still sees the whole message — so it stays allowed.
 */
function isStaticString(node: TSESTree.Node): boolean {
  const expression = unwrapExpression(node);
  if (expression.type === 'Literal') {
    return typeof expression.value === 'string';
  }
  if (expression.type === 'TemplateLiteral') {
    return expression.expressions.length === 0;
  }
  if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return isStaticString(expression.left) && isStaticString(expression.right);
  }
  return false;
}

/**
 * Returns the message argument's `+` expression when it concatenates something
 * the extractor cannot read, or null otherwise.
 *
 * Only the argument's own top-level form is inspected. A `+` buried inside a
 * larger expression — `('Delete ' + name).trim()`, `xs.map(x => 'p' + x)` —
 * is not what reaches the message slot, so reporting it here would point at
 * the wrong node and duplicate what `no-dynamic-translation` already says
 * about the argument as a whole.
 */
function getDynamicConcatenation(
  node: TSESTree.Node
): TSESTree.BinaryExpression | null {
  const expression = unwrapExpression(node);
  if (expression.type !== 'BinaryExpression' || expression.operator !== '+') {
    return null;
  }
  return isStaticString(expression) ? null : expression;
}

const noTranslationConcatenation = createRule({
  name: 'no-translation-concatenation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid concatenating dynamic values into translation messages',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-translation-concatenation/'
    },
    messages: {
      noConcatenation:
        'Do not concatenate values into translation strings; the extractor only reads the literal parts. Use a placeholder instead, e.g. trans.__("Hello %1", name).'
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
          if (!argument) {
            continue;
          }
          const concatenation = getDynamicConcatenation(argument);
          if (concatenation) {
            context.report({
              node: concatenation,
              messageId: 'noConcatenation'
            });
          }
        }
      }
    };
  }
});

export = noTranslationConcatenation;
