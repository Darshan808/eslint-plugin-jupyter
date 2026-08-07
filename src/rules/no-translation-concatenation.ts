/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import { TSESTree } from '@typescript-eslint/types';
import { TSESLint } from '@typescript-eslint/utils';
import {
  BUNDLE_METHODS,
  STATIC_ARGUMENT_INDICES,
  isTransBundle
} from '../utils/translation';

type MessageId = 'noConcatenation' | 'noInterpolation' | 'noDynamicMessage';

interface Problem {
  node: TSESTree.Node;
  messageId: MessageId;
}

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
 * Unwraps string methods that pass their receiver's text through, so that
 * `("Delete " + name).trim()` is still judged on the concatenation inside.
 */
const TRANSPARENT_STRING_METHODS = new Set(['trim', 'trimStart', 'trimEnd']);

function unwrapTransparentCall(node: TSESTree.Node): TSESTree.Node {
  const expression = unwrapExpression(node);
  if (
    expression.type === 'CallExpression' &&
    expression.arguments.length === 0 &&
    expression.callee.type === 'MemberExpression' &&
    !expression.callee.computed &&
    expression.callee.property.type === 'Identifier' &&
    TRANSPARENT_STRING_METHODS.has(expression.callee.property.name)
  ) {
    return unwrapTransparentCall(expression.callee.object);
  }
  return expression;
}

/**
 * Returns true when the translation string extractor can read this
 * expression's text straight from the source: a string literal, a template
 * literal with no interpolation, or a `+` tree of those.
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
 * Walks up the scope chain to find the variable an identifier refers to.
 */
function resolveVariable(
  sourceCode: TSESLint.SourceCode,
  identifier: TSESTree.Identifier
): TSESLint.Scope.Variable | null {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

/**
 * Returns the single expression that determines a variable's value, or null
 * when that cannot be established with confidence: parameters, imports,
 * destructured bindings, and variables written more than once. Skipping those
 * keeps generic translation helpers such as
 * `function t(key: string) { return trans.__(key); }` quiet.
 */
function getSoleWrittenExpression(
  variable: TSESLint.Scope.Variable
): TSESTree.Node | null {
  if (variable.defs.length !== 1) {
    return null;
  }
  const [definition] = variable.defs;
  if (
    definition.type !== 'Variable' ||
    definition.node.type !== 'VariableDeclarator' ||
    definition.node.id.type !== 'Identifier' ||
    !definition.node.init
  ) {
    return null;
  }
  const writes = variable.references.filter(reference => reference.isWrite());
  if (writes.length !== 1 || writes[0].writeExpr !== definition.node.init) {
    return null;
  }
  return definition.node.init;
}

/**
 * Reports what makes an argument unreadable to the string extractor, or null
 * when the extractor can handle it.
 */
function classify(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  seen: Set<TSESLint.Scope.Variable>
): Problem | null {
  const expression = unwrapTransparentCall(node);
  if (isStaticString(expression)) {
    return null;
  }

  // 'Delete ' + fileName
  if (expression.type === 'BinaryExpression' && expression.operator === '+') {
    return { node: expression, messageId: 'noConcatenation' };
  }

  // `Delete ${fileName}`
  if (expression.type === 'TemplateLiteral') {
    return {
      node: expression.expressions[0] ?? expression,
      messageId: 'noInterpolation'
    };
  }

  // cond ? 'Yes' : 'No' — both branches are extracted, so check both.
  if (expression.type === 'ConditionalExpression') {
    return (
      classify(sourceCode, expression.consequent, seen) ??
      classify(sourceCode, expression.alternate, seen)
    );
  }

  if (expression.type === 'Identifier') {
    return classifyIdentifier(sourceCode, expression, seen);
  }

  // Calls, member access and everything else are left alone: the extractor
  // cannot read them either, but flagging them would bury the real problems.
  return null;
}

function classifyIdentifier(
  sourceCode: TSESLint.SourceCode,
  identifier: TSESTree.Identifier,
  seen: Set<TSESLint.Scope.Variable>
): Problem | null {
  const variable = resolveVariable(sourceCode, identifier);
  if (!variable || seen.has(variable)) {
    return null;
  }
  // Guards against cycles such as `let a = b; let b = a;`.
  seen.add(variable);

  const written = getSoleWrittenExpression(variable);
  if (!written) {
    return null;
  }

  const problem = classify(sourceCode, written, seen);
  return problem ? { node: problem.node, messageId: 'noDynamicMessage' } : null;
}

const noTranslationConcatenation = createRule({
  name: 'no-translation-concatenation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid dynamically built strings inside translation wrapper calls',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-translation-concatenation/'
    },
    messages: {
      noConcatenation:
        'Do not use string concatenation inside translation wrappers. Use a placeholder instead, e.g. trans.__("Hello %1", name).',
      noInterpolation:
        'Do not interpolate values into translation strings; the extractor only reads the literal text around ${}. Use a placeholder instead, e.g. trans.__("Delete %1", fileName).',
      noDynamicMessage:
        'This translation string is built dynamically, so the translation string extractor cannot read it. Pass a literal with placeholders instead, e.g. trans.__("Kernel %1", status).'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    const sourceCode = context.sourceCode;

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
          const problem = classify(sourceCode, argument, new Set());
          if (problem) {
            context.report({
              node: problem.node,
              messageId: problem.messageId
            });
          }
        }
      }
    };
  }
});

export = noTranslationConcatenation;
