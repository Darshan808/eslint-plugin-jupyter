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

The plugin exports a `recommended` config that comes with sensible defaults. It is an array of config objects, so wrap your config in `defineConfig`, which accepts nested arrays. The recommended rules lint TypeScript, so you also need a TypeScript parser, and several rules (such as `require-signal-cleanup` and `prefer-signal-this-arg`) only report when type information is available. The example below uses [typescript-eslint](https://typescript-eslint.io/) for both:

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
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
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
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
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
