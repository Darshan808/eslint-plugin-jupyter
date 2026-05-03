/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import type { TSESTree } from '@typescript-eslint/utils';

type JSONKey =
  | { type: 'JSONLiteral'; value: unknown }
  | { type: 'JSONIdentifier'; name: string };

interface JSONPropertyNode {
  key: JSONKey;
  value: { type: string };
  loc: TSESTree.SourceLocation;
}

function isSchemaJsonFile(filename: string): boolean {
  return /[/\\]schema[/\\][^/\\]*\.json$/.test(filename);
}

const noSchemaEnum = createRule({
  name: 'no-schema-enum',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow `enum` in settings JSON schema files; use `oneOf` with `const` and `title` instead'
    },
    messages: {
      forbidEnum:
        'Avoid `enum` in settings schema. Use `oneOf` with `const` and `title` per entry to support user-facing labels and translations.'
    },
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
      }
    };
  }
});

export = noSchemaEnum;
