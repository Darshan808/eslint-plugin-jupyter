/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { isAddCommandCall } from '../utils/commands';
import { getObjectProperties } from '../utils/plugin-utils';
import { createRule } from '../utils/create-rule';

/**
 * Returns true if the node is a non-empty raw string literal that should be
 * wrapped in a translation call. Handles:
 *   - String Literal: 'string' or "string"
 *   - TemplateLiteral with no expressions: `string`
 *   - Concise ArrowFunctionExpression whose body is one of the above
 */
function isRawStringNode(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'string' && node.value.length > 0;
  }
  if (node.type === 'TemplateLiteral') {
    if (node.expressions.length > 0) {
      return false;
    }
    const cooked = node.quasis.map(q => q.value.cooked ?? '').join('');
    return cooked.length > 0;
  }
  if (
    node.type === 'ArrowFunctionExpression' &&
    node.body.type !== 'BlockStatement'
  ) {
    return isRawStringNode(node.body);
  }
  return false;
}

function isSetAttributeCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'MemberExpression') {
    const callee = node.callee;
    if (
      callee.property.type === 'Identifier' &&
      callee.property.name === 'setAttribute'
    ) {
      return true;
    }
  }
  return false;
}

const MONITORED_COMMAND_PROPS = ['label', 'caption', 'description'];
const MONITORED_SET_ATTRIBUTE_ATTRS = ['aria-label', 'aria-description', 'title'];
const MONITORED_ASSIGNMENT_PROPS = ['title', 'ariaLabel'];

const noUntranslatedString = createRule({
  name: 'no-untranslated-string',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require user-facing string literals to be wrapped in a translation call such as trans.__()',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/no-untranslated-string/'
    },
    messages: {
      untranslatedCommandProp:
        'Command property "{{ prop }}" has an untranslated string literal. Wrap it with trans.__().',
      untranslatedSetAttribute:
        'setAttribute("{{ attr }}", ...) has an untranslated string literal. Wrap the value with trans.__().',
      untranslatedPropertyAssign:
        'Assignment to "{{ prop }}" has an untranslated string literal. Wrap it with trans.__().'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    return {
      CallExpression(node) {
        // commands.addCommand(id, { label, caption, description })
        if (isAddCommandCall(node)) {
          if (node.arguments.length < 2) {
            return;
          }
          const optionsArg = node.arguments[1];
          if (optionsArg.type !== 'ObjectExpression') {
            return;
          }
          const properties = getObjectProperties(optionsArg);
          for (const propName of MONITORED_COMMAND_PROPS) {
            const prop = properties.get(propName);
            if (prop && isRawStringNode(prop.value)) {
              context.report({
                node: prop.value,
                messageId: 'untranslatedCommandProp',
                data: { prop: propName }
              });
            }
          }
          return;
        }

        // element.setAttribute('aria-label'/'title', string)
        if (isSetAttributeCall(node)) {
          if (node.arguments.length < 2) {
            return;
          }
          const attrNameArg = node.arguments[0];
          if (
            attrNameArg.type !== 'Literal' ||
            typeof attrNameArg.value !== 'string'
          ) {
            return;
          }
          if (!MONITORED_SET_ATTRIBUTE_ATTRS.includes(attrNameArg.value)) {
            return;
          }
          const attrValueArg = node.arguments[1];
          if (isRawStringNode(attrValueArg)) {
            context.report({
              node: attrValueArg,
              messageId: 'untranslatedSetAttribute',
              data: { attr: attrNameArg.value }
            });
          }
        }
      },

      AssignmentExpression(node) {
        if (node.operator !== '=') {
          return;
        }
        const left = node.left;
        if (
          left.type !== 'MemberExpression' ||
          left.computed ||
          left.property.type !== 'Identifier'
        ) {
          return;
        }
        const propName = left.property.name;
        if (
          MONITORED_ASSIGNMENT_PROPS.includes(propName) &&
          isRawStringNode(node.right)
        ) {
          context.report({
            node: node.right,
            messageId: 'untranslatedPropertyAssign',
            data: { prop: propName }
          });
        }
      }
    };
  }
});

export = noUntranslatedString;
