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
const MONITORED_DIALOG_PROPS = ['title', 'body'];

/** Object property names checked in any object literal. */
const DEFAULT_CHECK_PROPERTIES = ['label', 'category'];
/** JSX attribute names checked on any element. */
const DEFAULT_CHECK_JSX_ATTRIBUTES = [...MONITORED_A11Y_ATTRS, 'label'];
/**
 * Property names checked on the left-hand side of an assignment. `label` and
 * `caption` also cover Lumino widget titles (`this.title.label = '...'`).
 */
const DEFAULT_CHECK_ASSIGNMENTS = [
  'title',
  'ariaLabel',
  'alt',
  'textContent',
  'label',
  'caption'
];

interface Options {
  enforcePunctuation?: boolean;
  checkProperties?: string[];
  checkJsxAttributes?: string[];
  checkAssignments?: string[];
}

type MessageId =
  | 'untranslatedCommandProp'
  | 'untranslatedSetAttribute'
  | 'untranslatedPropertyAssign'
  | 'untranslatedDialogOption'
  | 'untranslatedDialogButtonLabel'
  | 'untranslatedJsxText'
  | 'untranslatedJsxAttribute'
  | 'untranslatedProperty';

/**
 * Returns the static name of a non-computed object property key, or null when
 * the key is computed or not a plain identifier/string.
 */
function getPropertyKeyName(node: TSESTree.Property): string | null {
  if (node.computed) {
    return null;
  }
  if (node.key.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value;
  }
  return null;
}

const NAME_LIST_SCHEMA = {
  type: 'array' as const,
  items: { type: 'string' as const },
  uniqueItems: true
};

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
      untranslatedDialogOption:
        'Dialog/showDialog "{{ prop }}" option has an untranslated string literal. Wrap it with trans.__().',
      untranslatedDialogButtonLabel:
        'Dialog button "label" option has an untranslated string literal. Wrap it with trans.__().',
      untranslatedJsxText:
        'JSX text content has an untranslated string literal. Wrap it with {trans.__(...)}',
      untranslatedJsxAttribute:
        'JSX attribute "{{ prop }}" has an untranslated string literal. Wrap it with {trans.__(...)}',
      untranslatedProperty:
        'Property "{{ prop }}" has an untranslated string literal. Wrap it with trans.__().'
    },
    schema: [
      {
        type: 'object',
        properties: {
          enforcePunctuation: { type: 'boolean' },
          checkProperties: NAME_LIST_SCHEMA,
          checkJsxAttributes: NAME_LIST_SCHEMA,
          checkAssignments: NAME_LIST_SCHEMA
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    {
      enforcePunctuation: false,
      checkProperties: DEFAULT_CHECK_PROPERTIES,
      checkJsxAttributes: DEFAULT_CHECK_JSX_ATTRIBUTES,
      checkAssignments: DEFAULT_CHECK_ASSIGNMENTS
    }
  ],

  create(context) {
    const options = context.options[0] as Options | undefined;
    const enforcePunctuation = options?.enforcePunctuation ?? false;
    const checkProperties = new Set(
      options?.checkProperties ?? DEFAULT_CHECK_PROPERTIES
    );
    const checkJsxAttributes = new Set(
      options?.checkJsxAttributes ?? DEFAULT_CHECK_JSX_ATTRIBUTES
    );
    const checkAssignments = new Set(
      options?.checkAssignments ?? DEFAULT_CHECK_ASSIGNMENTS
    );

    /**
     * Returns true if the text should be wrapped in a translation call. Blank
     * strings are never reported. Strings with no letters, such as '/' and '¶',
     * are only reported when `enforcePunctuation` is on.
     */
    function isReportableText(value: string): boolean {
      return (
        value.trim().length > 0 && (enforcePunctuation || hasLetters(value))
      );
    }

    /**
     * Returns true if the node is a raw string literal (or a concise arrow
     * returning one) whose text should be wrapped in a translation call.
     */
    function isReportableString(node: TSESTree.Node): boolean {
      const value = getRawStringValue(node);
      return value !== null && isReportableText(value);
    }

    // Nodes already reported by a more specific branch (e.g. addCommand or a
    // Dialog button builder), so the generic `checkProperties` check does not
    // duplicate them. Enclosing calls are visited before the properties they
    // contain, so the specific branch always runs first.
    const reportedNodes = new Set<TSESTree.Node>();

    function report(
      node: TSESTree.Node,
      messageId: MessageId,
      data?: Record<string, string>
    ): void {
      reportedNodes.add(node);
      context.report({ node, messageId, data });
    }

    /**
     * Reports a monitored JSX attribute whose value is a raw string.
     */
    function checkJsxAttributeValue(
      attrName: string | null,
      value: TSESTree.Node
    ): void {
      if (!attrName || !checkJsxAttributes.has(attrName)) {
        return;
      }
      if (isReportableString(value)) {
        report(value, 'untranslatedJsxAttribute', { prop: attrName });
      }
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
            if (prop && isReportableString(prop.value)) {
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
          if (isReportableString(attrValueArg)) {
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
            if (prop && isReportableString(prop.value)) {
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
          if (labelProp && isReportableString(labelProp.value)) {
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
          if (prop && isReportableString(prop.value)) {
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

        // Any monitored assignment target: element.title = STRING,
        // widget.label = STRING, this.label = STRING, node.textContent = STRING,
        // and Lumino widget titles such as this.title.label = STRING
        if (
          checkAssignments.has(left.property.name) &&
          isReportableString(node.right)
        ) {
          report(node.right, 'untranslatedPropertyAssign', {
            prop: left.property.name
          });
        }
      },

      // Any monitored object property: { label: 'raw string' }.
      // Runs after the call-specific branches above, which mark the nodes they
      // already reported so a property is never reported twice.
      Property(node) {
        if (node.shorthand) {
          return;
        }
        const keyName = getPropertyKeyName(node);
        if (!keyName || !checkProperties.has(keyName)) {
          return;
        }
        if (reportedNodes.has(node.value) || !isReportableString(node.value)) {
          return;
        }
        report(node.value, 'untranslatedProperty', { prop: keyName });
      },

      // Monitored attribute with a plain string: <span aria-label="text" />
      JSXAttribute(node) {
        if (!node.value || node.value.type === 'JSXExpressionContainer') {
          return;
        }
        const attrName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        checkJsxAttributeValue(attrName, node.value);
      },

      // Raw text between JSX tags: <span>Untranslated text</span>
      JSXText(node) {
        if (isReportableText(node.value)) {
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
          checkJsxAttributeValue(attrName, node.expression);
          return;
        }
        if (isReportableString(node.expression)) {
          report(node.expression, 'untranslatedJsxText');
        }
      }
    };
  }
});

export = noUntranslatedString;
