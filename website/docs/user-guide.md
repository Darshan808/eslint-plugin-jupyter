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

The plugin exports a `recommended` config that comes with sensible defaults:

```js
import jupyterPlugin from '@jupyter/eslint-plugin';

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
  "plugins": ["@jupyter/eslint-plugin"],
  "extends": ["plugin:@jupyter/eslint-plugin/recommended-legacy"]
}
```

### Overriding Rules

You can override individual rules from the recommended config:

```js
import jupyterPlugin from '@jupyter/eslint-plugin';

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
