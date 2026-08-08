/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';
import {
  BUNDLE_METHODS,
  STATIC_ARGUMENT_INDICES,
  isTransBundle
} from '../utils/translation';

type MessageId = 'noConcatenation' | 'noInterpolation' | 'noDynamicMessage';

/**
 * Skips TypeScript-only and optional-chaining wrapper nodes so the underlying
 * expression can be inspected.
 */
function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  switch (node.type) {
    case 'ChainExpression':
    case 'TSNonNullExpression':
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
      return unwrapExpression(node.expression);
    default:
      return node;
  }
}

/**
 * Returns true when the message is written out at the call site: a string
 * literal, a template literal with no interpolation, or a `+` tree of those.
 *
 * The string extractor reads the call site and nothing else — it never follows
 * a variable to its definition — so anything else leaves it with no message to
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
  if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return isStaticString(expression.left) && isStaticString(expression.right);
  }
  return false;
}

/**
 * Picks the message that best explains why an argument is not extractable.
 */
function getMessageId(node: TSESTree.Node): MessageId {
  const expression = unwrapExpression(node);
  if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return 'noConcatenation';
  }
  if (expression.type === 'TemplateLiteral') {
    return 'noInterpolation';
  }
  return 'noDynamicMessage';
}

const noTranslationConcatenation = createRule({
  name: 'no-translation-concatenation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require translation messages to be written as literals at the call site',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-translation-concatenation/'
    },
    messages: {
      noConcatenation:
        'Do not use string concatenation inside translation wrappers. Use a placeholder instead, e.g. trans.__("Hello %1", name).',
      noInterpolation:
        'Do not interpolate values into translation strings; the extractor only reads the literal text around ${}. Use a placeholder instead, e.g. trans.__("Delete %1", fileName).',
      noDynamicMessage:
        'Write the translation string as a literal in the call itself. The extractor reads this call site only and does not follow variables or expressions, e.g. trans.__("Kernel %1", status).'
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
          if (!argument || argument.type === 'SpreadElement') {
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

export = noTranslationConcatenation;
