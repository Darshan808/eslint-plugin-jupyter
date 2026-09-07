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
    // oneOf is used instead of enum with an explicit type — correct pattern
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          defaultZoom: {
            type: 'string',
            oneOf: [
              { const: 'fit-to-width', title: 'Fit to width' },
              { const: 'fit-to-height', title: 'Fit to height' },
              { const: '100%', title: '100%' }
            ]
          }
        }
      })
    },
    // nullable oneOf schemas need a more specific type declaration than this
    // rule can safely infer.
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: {
            oneOf: [
              { const: 'default', title: 'Default' },
              { const: null, title: 'None' }
            ]
          }
        }
      })
    },
    // string remains valid when included in a JSON Schema type array
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: {
            type: ['string', 'null'],
            oneOf: [
              { const: 'default', title: 'Default' },
              { const: 'single', title: 'Single' }
            ]
          }
        }
      })
    },
    // Existing type declarations are left alone to avoid producing duplicate
    // JSON keys.
    {
      filename: SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: {
            type: 'number',
            oneOf: [
              { const: 'default', title: 'Default' },
              { const: 'single', title: 'Single' }
            ]
          }
        }
      })
    },
    // oneOf without type in a non-schema directory is allowed
    {
      filename: NON_SCHEMA_FILENAME,
      code: JSON.stringify({
        properties: {
          mode: {
            oneOf: [
              { const: 'default', title: 'Default' },
              { const: 'single', title: 'Single' }
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
    },
    // oneOf string choices without type fail to render in RJSF
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
      }),
      output: JSON.stringify({
        properties: {
          defaultZoom: {
            type: 'string',
            oneOf: [
              { const: 'fit-to-width', title: 'Fit to width' },
              { const: 'fit-to-height', title: 'Fit to height' },
              { const: '100%', title: '100%' }
            ]
          }
        }
      }),
      errors: [{ messageId: 'requireStringType' }]
    },
    // The autofix preserves multiline JSON indentation
    {
      filename: SCHEMA_FILENAME,
      code: `{
  "properties": {
    "mode": {
      "title": "Mode",
      "oneOf": [
        { "const": "default", "title": "Default" },
        { "const": "single", "title": "Single" }
      ]
    }
  }
}`,
      output: `{
  "properties": {
    "mode": {
      "title": "Mode",
      "type": "string",
      "oneOf": [
        { "const": "default", "title": "Default" },
        { "const": "single", "title": "Single" }
      ]
    }
  }
}`,
      errors: [{ messageId: 'requireStringType' }]
    },
    // The autofix keeps the spacing of an object held on a single line, which is
    // what Prettier emits when the object fits within the print width.
    {
      filename: SCHEMA_FILENAME,
      code: `{
  "properties": {
    "mode": { "title": "M", "oneOf": [{ "const": "a" }] }
  }
}`,
      output: `{
  "properties": {
    "mode": { "title": "M", "type": "string", "oneOf": [{ "const": "a" }] }
  }
}`,
      errors: [{ messageId: 'requireStringType' }]
    },
    // A whole file on one line with no spacing keeps that style too
    {
      filename: SCHEMA_FILENAME,
      code: '{"mode":{"title":"M","oneOf":[{"const":"a"}]}}',
      output: '{"mode":{"title":"M","type":"string","oneOf":[{"const":"a"}]}}',
      errors: [{ messageId: 'requireStringType' }]
    }
  ]
});
