/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import type { TSESTree } from '@typescript-eslint/utils';

type JSONKey =
  | { type: 'JSONLiteral'; value: unknown }
  | { type: 'JSONIdentifier'; name: string };

interface JSONNode {
  type: string;
  range: [number, number];
  loc: TSESTree.SourceLocation;
  value?: unknown;
}

interface JSONPropertyNode {
  type: 'JSONProperty';
  key: JSONKey;
  value: JSONNode;
  parent?: JSONNode;
  range: [number, number];
  loc: TSESTree.SourceLocation;
}

interface JSONObjectExpressionNode extends JSONNode {
  type: 'JSONObjectExpression';
  properties: JSONPropertyNode[];
}

interface JSONArrayExpressionNode extends JSONNode {
  type: 'JSONArrayExpression';
  elements: JSONNode[];
}

function isSchemaJsonFile(filename: string): boolean {
  return /[/\\]schema[/\\][^/\\]*\.json$/.test(filename);
}

function getProperty(
  node: JSONObjectExpressionNode,
  name: string
): JSONPropertyNode | undefined {
  return node.properties.find(property => {
    if (property.key.type === 'JSONLiteral') {
      return property.key.value === name;
    }

    return property.key.name === name;
  });
}

function hasOnlyStringConstChoices(node: JSONArrayExpressionNode): boolean {
  return (
    node.elements.length > 0 &&
    node.elements.every(element => {
      if (element.type !== 'JSONObjectExpression') {
        return false;
      }

      const constProperty = getProperty(
        element as JSONObjectExpressionNode,
        'const'
      );

      return (
        constProperty !== undefined &&
        constProperty.value.type === 'JSONLiteral' &&
        typeof constProperty.value.value === 'string'
      );
    })
  );
}

function getStringTypeInsertion(
  sourceCode: { text: string },
  node: JSONPropertyNode
): string {
  const beforeNode = sourceCode.text.slice(0, node.range[0]);
  const lastNewline = beforeNode.lastIndexOf('\n');
  const lineStart = beforeNode.slice(lastNewline + 1);

  if (lastNewline !== -1 && /^[ \t]*$/.test(lineStart)) {
    const lineBreak = sourceCode.text.includes('\r\n') ? '\r\n' : '\n';

    return `"type": "string",${lineBreak}${lineStart}`;
  }

  // The property shares its line with an earlier token, so the new property has
  // to go on that line too. Repeat the spacing that already separates the
  // properties, which keeps a Prettier-formatted single-line object formatted.
  const spacing = /[ \t]*$/.exec(beforeNode)?.[0] ?? '';

  return spacing ? `"type": "string",${spacing}` : '"type":"string",';
}

const noSchemaEnum = createRule({
  name: 'no-schema-enum',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `enum` in settings JSON schema files; use `oneOf` with `const`, `title`, and `type` instead'
    },
    messages: {
      forbidEnum:
        'Avoid `enum` in settings schema. Use `oneOf` with `const` and `title` per entry to support user-facing labels and translations.',
      requireStringType:
        'Add `type: "string"` next to `oneOf`; React JSON Schema Form may not render string choices without it.'
    },
    fixable: 'code',
    schema: []
  },
  defaultOptions: [],

  create(context) {
    if (!isSchemaJsonFile(context.filename)) {
      return {};
    }

    return {
      JSONProperty(node: JSONPropertyNode) {
        const keyValue =
          node.key.type === 'JSONLiteral' ? node.key.value : node.key.name;

        if (keyValue === 'enum' && node.value.type === 'JSONArrayExpression') {
          context.report({ loc: node.loc, messageId: 'forbidEnum' });
        }

        if (keyValue !== 'oneOf' || node.value.type !== 'JSONArrayExpression') {
          return;
        }

        const schemaNode =
          node.parent?.type === 'JSONObjectExpression'
            ? (node.parent as JSONObjectExpressionNode)
            : undefined;

        if (
          !schemaNode ||
          getProperty(schemaNode, 'type') ||
          !hasOnlyStringConstChoices(node.value as JSONArrayExpressionNode)
        ) {
          return;
        }

        context.report({
          loc: node.loc,
          messageId: 'requireStringType',
          fix: fixer =>
            fixer.insertTextBeforeRange(
              [node.range[0], node.range[0]],
              getStringTypeInsertion(context.sourceCode, node)
            )
        });
      }
    };
  }
});

export = noSchemaEnum;
