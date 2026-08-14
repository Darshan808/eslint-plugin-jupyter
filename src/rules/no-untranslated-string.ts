/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { isAddCommandCall } from '../utils/commands';
import { getObjectProperties } from '../utils/plugin-utils';
import { createRule } from '../utils/create-rule';

function hasLetters(str: string): boolean {
  return /\p{L}/u.test(str);
}

function getRawStringValue(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(q => q.value.cooked ?? '').join('');
  }
  if (
    node.type === 'ArrowFunctionExpression' &&
    node.body.type !== 'BlockStatement'
  ) {
    return getRawStringValue(node.body);
  }
  return null;
}

/**
 * Returns true if the node is a non-empty raw string literal that should be
 * wrapped in a translation call.
 */
function isRawStringNode(node: TSESTree.Node): boolean {
  const rawValue = getRawStringValue(node);
  return rawValue !== null && rawValue.trim().length > 0;
}

function isSetAttributeCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'setAttribute'
  );
}

function isShowDialogCall(node: TSESTree.CallExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name === 'showDialog';
}

function isDialogConstructor(node: TSESTree.NewExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name === 'Dialog';
}

const DIALOG_BUTTON_BUILDERS = [
  'okButton',
  'cancelButton',
  'warnButton',
  'errorButton'
];

function isDialogButtonCall(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    DIALOG_BUTTON_BUILDERS.includes(node.callee.property.name)
  );
}

const MONITORED_COMMAND_PROPS = ['label', 'caption', 'usage'];
const MONITORED_A11Y_ATTRS = ['aria-label', 'aria-description', 'title'];
const MONITORED_SET_ATTRIBUTE_ATTRS = MONITORED_A11Y_ATTRS;
const MONITORED_ASSIGNMENT_PROPS = ['title', 'ariaLabel'];
const MONITORED_DIALOG_PROPS = ['title', 'body'];
const MONITORED_JSX_ATTRS = MONITORED_A11Y_ATTRS;

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
        'Assignment to "{{ prop }}" has an untranslated string literal. Wrap it with trans.__().',
      untranslatedTitleProp:
        'Assignment to "title.{{ prop }}" has an untranslated string literal. Wrap it with trans.__().',
      untranslatedDialogOption:
        'Dialog/showDialog "{{ prop }}" option has an untranslated string literal. Wrap it with trans.__().',
      untranslatedDialogButtonLabel:
        'Dialog button "label" option has an untranslated string literal. Wrap it with trans.__().',
      untranslatedJsxText:
        'JSX text content has an untranslated string literal. Wrap it with {trans.__(...)}',
      untranslatedLabelProp:
        '"label" has an untranslated string literal. Wrap it with trans.__().'
    },
    schema: [
      {
        type: 'object',
        properties: {
          enforcePunctuation: { type: 'boolean' },
          checkAllLabels: { type: 'boolean' }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{ enforcePunctuation: false, checkAllLabels: false }],

  create(context) {
    const options = context.options[0] as
      | { enforcePunctuation?: boolean; checkAllLabels?: boolean }
      | undefined;
    const enforcePunctuation = options?.enforcePunctuation ?? false;
    const checkAllLabels = options?.checkAllLabels ?? false;

    // Nodes already reported by a more specific branch (e.g. addCommand or a
    // Dialog button builder), so the generic `label` check does not duplicate
    // them. Enclosing calls are visited before the properties they contain.
    const reportedNodes = new Set<TSESTree.Node>();

    function report(
      node: TSESTree.Node,
      messageId:
        | 'untranslatedCommandProp'
        | 'untranslatedSetAttribute'
        | 'untranslatedPropertyAssign'
        | 'untranslatedTitleProp'
        | 'untranslatedDialogOption'
        | 'untranslatedDialogButtonLabel'
        | 'untranslatedJsxText'
        | 'untranslatedLabelProp',
      data?: Record<string, string>
    ): void {
      reportedNodes.add(node);
      context.report({ node, messageId, data });
    }

    /**
     * Returns the message id to use for a JSX attribute, or null when the
     * attribute is not monitored.
     */
    function getJsxAttrMessageId(
      attrName: string | null
    ): 'untranslatedJsxText' | 'untranslatedLabelProp' | null {
      if (!attrName) {
        return null;
      }
      if (MONITORED_JSX_ATTRS.includes(attrName)) {
        return 'untranslatedJsxText';
      }
      if (checkAllLabels && attrName === 'label') {
        return 'untranslatedLabelProp';
      }
      return null;
    }

    return {
      CallExpression(node) {
        // Branch A: commands.addCommand(id, { label, caption, usage })
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
              report(prop.value, 'untranslatedCommandProp', { prop: propName });
            }
          }
          return;
        }

        // Branch B: element.setAttribute('aria-label'/'aria-description'/'title', string)
        if (isSetAttributeCall(node)) {
          if (node.arguments.length < 2) {
            return;
          }
          const attrNameArg = node.arguments[0];
          if (
            attrNameArg.type !== 'Literal' ||
            typeof attrNameArg.value !== 'string' ||
            !MONITORED_SET_ATTRIBUTE_ATTRS.includes(attrNameArg.value)
          ) {
            return;
          }
          const attrValueArg = node.arguments[1];
          if (isRawStringNode(attrValueArg)) {
            report(attrValueArg, 'untranslatedSetAttribute', {
              attr: attrNameArg.value
            });
          }
          return;
        }

        // Branch C: showDialog({ title, body })
        if (isShowDialogCall(node)) {
          if (node.arguments.length < 1) {
            return;
          }
          const optionsArg = node.arguments[0];
          if (optionsArg.type !== 'ObjectExpression') {
            return;
          }
          const properties = getObjectProperties(optionsArg);
          for (const propName of MONITORED_DIALOG_PROPS) {
            const prop = properties.get(propName);
            if (prop && isRawStringNode(prop.value)) {
              report(prop.value, 'untranslatedDialogOption', {
                prop: propName
              });
            }
          }
          return;
        }

        // Branch D: Dialog.okButton/cancelButton/warnButton/errorButton({ label })
        if (isDialogButtonCall(node)) {
          if (node.arguments.length < 1) {
            return;
          }
          const optionsArg = node.arguments[0];
          if (optionsArg.type !== 'ObjectExpression') {
            return;
          }
          const properties = getObjectProperties(optionsArg);
          const labelProp = properties.get('label');
          if (labelProp && isRawStringNode(labelProp.value)) {
            report(labelProp.value, 'untranslatedDialogButtonLabel');
          }
        }
      },

      // new Dialog({ title, body })
      NewExpression(node) {
        if (!isDialogConstructor(node)) {
          return;
        }
        if (node.arguments.length < 1) {
          return;
        }
        const optionsArg = node.arguments[0];
        if (optionsArg.type !== 'ObjectExpression') {
          return;
        }
        const properties = getObjectProperties(optionsArg);
        for (const propName of MONITORED_DIALOG_PROPS) {
          const prop = properties.get(propName);
          if (prop && isRawStringNode(prop.value)) {
            report(prop.value, 'untranslatedDialogOption', { prop: propName });
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

        // element.title = STRING  or  element.ariaLabel = STRING
        if (
          MONITORED_ASSIGNMENT_PROPS.includes(left.property.name) &&
          isRawStringNode(node.right)
        ) {
          report(node.right, 'untranslatedPropertyAssign', {
            prop: left.property.name
          });
          return;
        }

        // *.title.label = STRING  or  *.title.caption = STRING
        if (
          (left.property.name === 'label' ||
            left.property.name === 'caption') &&
          left.object.type === 'MemberExpression' &&
          !left.object.computed &&
          left.object.property.type === 'Identifier' &&
          left.object.property.name === 'title' &&
          isRawStringNode(node.right)
        ) {
          report(node.right, 'untranslatedTitleProp', {
            prop: left.property.name
          });
        }
      },

      // Any `label: 'raw string'` object property, when `checkAllLabels` is on.
      // Runs after the more specific branches above, which mark the nodes they
      // already reported.
      Property(node) {
        if (!checkAllLabels || node.computed || node.shorthand) {
          return;
        }
        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal' && typeof node.key.value === 'string'
              ? node.key.value
              : null;
        if (keyName !== 'label') {
          return;
        }
        if (reportedNodes.has(node.value) || !isRawStringNode(node.value)) {
          return;
        }
        report(node.value, 'untranslatedLabelProp');
      },

      // Accessibility attribute with a plain string: <span aria-label="text" />
      JSXAttribute(node) {
        if (!node.value || node.value.type === 'JSXExpressionContainer') {
          return;
        }
        const attrName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        const messageId = getJsxAttrMessageId(attrName);
        if (!messageId) {
          return;
        }
        if (isRawStringNode(node.value)) {
          report(node.value, messageId);
        }
      },

      // Raw text between JSX tags: <span>Untranslated text</span>
      JSXText(node) {
        if (
          node.value.trim().length > 0 &&
          (enforcePunctuation || hasLetters(node.value))
        ) {
          report(node, 'untranslatedJsxText');
        }
      },

      // String literal inside JSX expression: <span>{'raw string'}</span>
      JSXExpressionContainer(node) {
        if (node.expression.type === 'JSXEmptyExpression') {
          return;
        }
        if (node.parent.type === 'JSXAttribute') {
          const attrName =
            node.parent.name.type === 'JSXIdentifier'
              ? node.parent.name.name
              : null;
          const messageId = getJsxAttrMessageId(attrName);
          if (!messageId) {
            return;
          }
          if (isRawStringNode(node.expression)) {
            report(node.expression, messageId);
          }
          return;
        }
        if (isRawStringNode(node.expression)) {
          const value = getRawStringValue(node.expression);
          if (
            value !== null &&
            (enforcePunctuation ? value.trim().length > 0 : hasLetters(value))
          ) {
            report(node.expression, 'untranslatedJsxText');
          }
        }
      }
    };
  }
});

export = noUntranslatedString;
