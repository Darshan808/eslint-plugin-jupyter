# User Guide

## Installation

Install with your package manager:

```bash
npm install --save-dev @jupyterlab/eslint-plugin-jupyter
```

## Configuration

### Flat Config (Recommended)

The plugin is designed for ESLint flat config format.

#### Minimal Setup

```js
import tsParser from '@typescript-eslint/parser';
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
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

The plugin exports a `recommended` config that comes with sensible defaults:

```js
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
  jupyterPlugin.configs.recommended
];
```

### For Legacy `.eslintrc` Configs

If you're still using legacy ESLint configuration, use the `recommended-legacy` config. This applies whether your ESLint config is in a `.eslintrc` file or in your `package.json`:

```json
{
  "plugins": ["@jupyterlab/eslint-plugin-jupyter"],
  "extends": ["plugin:@jupyterlab/eslint-plugin-jupyter/recommended-legacy"]
}
```

### Overriding Rules

You can override individual rules from the recommended config:

```js
import jupyterPlugin from '@jupyterlab/eslint-plugin-jupyter';

export default [
  {
    plugins: {
      jupyter: jupyterPlugin
    }
  },
  jupyterPlugin.configs.recommended,
  {
    rules: {
      'jupyter/command-described-by': 'error'
    }
  }
];
```
