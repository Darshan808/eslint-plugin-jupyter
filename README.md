# eslint-plugin

ESLint plugin for Jupyter core and extensions with early error catching and best practices enforcement.

## Installation

```bash
npm install --save-dev @jupyter/eslint-plugin
```

## Rules

- `command-described-by` - Ensure JupyterLab commands include describedBy property
- `plugin-activation-args` - Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order
- `plugin-description` - Ensure JupyterLab plugins have a description property

## Usage

Add `jupyter` to the plugins section of your ESLint configuration:

```javascript
// eslint.config.js
import jupyterPlugin from '@jupyter/eslint-plugin';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      jupyter: jupyterPlugin
    },
    rules: {
      'jupyter/command-described-by': 'warn',
      'jupyter/plugin-activation-args': 'warn',
      'jupyter/plugin-description': 'warn'
    }
  }
];
```

## License

BSD 3-Clause
