# `no-schema-enum`

Disallow `enum` in settings JSON schema files; use `oneOf` with `const` and `title` instead.

## Why

In JupyterLab/Notebook v7+, using `enum` in a settings JSON schema prevents associating user-facing labels with values and makes the options untranslatable. The `oneOf` pattern with `const` and `title` per entry solves both problems: the `title` is what the user sees, and the `const` is the value stored — and `title` can be passed through the translation system.

## Rule details

The rule inspects JSON files located inside a `schema/` directory and reports any property named `"enum"` whose value is an array. It does not flag `enum` used with a non-array value, and it ignores JSON files outside of `schema/` directories.

Requires [`jsonc-eslint-parser`](https://github.com/ota-meshi/jsonc-eslint-parser) (v2) to be configured as the parser for JSON files.

## Incorrect

```json
{
  "properties": {
    "defaultZoom": {
      "type": "string",
      "enum": ["fit-to-width", "fit-to-height", "100%"]
    }
  }
}
```

## Correct

```json
{
  "properties": {
    "defaultZoom": {
      "type": "string",
      "oneOf": [
        { "const": "fit-to-width", "title": "Fit to width" },
        { "const": "fit-to-height", "title": "Fit to height" },
        { "const": "100%", "title": "100%" }
      ]
    }
  }
}
```

## Options

This rule has no options.

## Configuration

Add the rule to your ESLint flat config for schema JSON files:

```js
import * as jsoncParser from 'jsonc-eslint-parser';
import jupyterPlugin from '@jupyter/eslint-plugin';

export default [
  {
    files: ['**/schema/*.json'],
    languageOptions: { parser: jsoncParser },
    plugins: { jupyter: jupyterPlugin },
    rules: {
      'jupyter/no-schema-enum': 'error'
    }
  }
];
```
