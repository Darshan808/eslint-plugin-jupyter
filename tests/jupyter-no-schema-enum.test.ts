/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noSchemaEnum from '../src/rules/no-schema-enum';

const SCHEMA_FILENAME = '/some/package/schema/plugin.json';
const NON_SCHEMA_FILENAME = '/some/package/src/plugin.json';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('jsonc-eslint-parser')
  }
});

// Cast needed because @typescript-eslint/rule-tester bundles its own copy of
// @typescript-eslint/utils, causing a structural type mismatch at the IDE level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ruleTester.run('no-schema-enum', noSchemaEnum as any, {
  valid: [
    // oneOf is used instead of enum — correct pattern
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          defaultZoom: {
            oneOf: [
              { const: 'fit-to-width', title: 'Fit to width' },
              { const: 'fit-to-height', title: 'Fit to height' },
              { const: '100%', title: '100%' }
            ]
          }
        }
      })
    },
    // enum in a non-schema directory is allowed
    {
      filename: NON_SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: {
            type: 'string',
            enum: ['a', 'b', 'c']
          }
        }
      })
    },
    // enum used as a JSON Schema keyword outside a property value (e.g. as a
    // string literal) — not an array, should not be flagged
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({ enum: 'not-an-array' })
    }
  ],

  invalid: [
    // Top-level enum array
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({ enum: ['a', 'b', 'c'] }),
      errors: [{ messageId: 'forbidEnum' }]
    },
    // Nested inside a property definition
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          defaultZoom: {
            type: 'string',
            enum: ['fit-to-width', 'fit-to-height', '100%']
          }
        }
      }),
      errors: [{ messageId: 'forbidEnum' }]
    },
    // Multiple enum usages in the same file
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: { enum: ['always', 'never'] },
          zoom: { enum: ['fit', '100%'] }
        }
      }),
      errors: [{ messageId: 'forbidEnum' }, { messageId: 'forbidEnum' }]
    }
  ]
});
