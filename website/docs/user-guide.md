# User Guide

## Installation

Install with your package manager:

```bash
npm install --save-dev @jupyter/eslint-plugin
```

## Configuration

### Flat Config (Recommended)

The plugin is designed for ESLint's flat config format, which was set to the default in [ESLint 9.0.0](https://eslint.org/blog/2024/04/eslint-v9.0.0-released/).

#### Minimal Setup

```js
import jupyterPlugin from '@jupyter/eslint-plugin';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      // Your TypeScript parser config...
    },
    plugins: {
      jupyter: jupyterPlugin
    },
    rules: {
      'jupyter/command-described-by': 'warn',
      'jupyter/plugin-activation-args': 'error',
      'jupyter/plugin-description': 'warn'
    }
  }
];
```

### Using Recommended Config

The plugin exports a `recommended` config with sensible defaults. Use it inside `defineConfig`. TypeScript files need a TypeScript parser, and some rules, such as `require-signal-cleanup`, only report with type information. The example below sets up both with [typescript-eslint](https://typescript-eslint.io/):

```bash
npm install --save-dev typescript-eslint
```

Both the recommended configuration example below and the overriding-rules example require ESLint 9.22.0 or newer.

```js
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import jupyterPlugin from '@jupyter/eslint-plugin';

export default defineConfig([
  tseslint.configs.recommended,
  jupyterPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  }
]);
```

### For Legacy `.eslintrc` Configs

If you're still using legacy ESLint configuration, use the `recommended-legacy` config. This applies whether your ESLint config is in a `.eslintrc` file or in your `package.json`:

```json
{
  "plugins": ["@jupyter/eslint-plugin"],
  "extends": ["plugin:@jupyter/eslint-plugin/recommended-legacy"]
}
```

### Overriding Rules

You can override individual rules from the recommended config by adding a config object after it:

```js
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import jupyterPlugin from '@jupyter/eslint-plugin';

export default defineConfig([
  tseslint.configs.recommended,
  jupyterPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  },
  {
    rules: {
      'jupyter/command-described-by': 'error'
    }
  }
]);
```
