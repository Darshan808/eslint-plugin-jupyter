# eslint-plugin-jupyter

ESLint plugin for Jupyter core and extensions with early error catching and best practices enforcement.

## Installation

```bash
npm install --save-dev eslint-plugin-jupyter
```

## Rules

- `jupyter-command-described-by` - Ensure JupyterLab commands include describedBy property
- `jupyter-plugin-activation-args` - Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order
- `jupyter-plugin-description` - Ensure JupyterLab plugins have a description property

## Usage

Add `jupyter` to the plugins section of your ESLint configuration:

```javascript
// eslint.config.js
const jupyterPlugin = require('eslint-plugin-jupyter');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      jupyter: jupyterPlugin,
    },
    rules: {
      'jupyter/jupyter-command-described-by': 'warn',
      'jupyter/jupyter-plugin-activation-args': 'warn',
      'jupyter/jupyter-plugin-description': 'warn',
    },
  },
];
```

## License

MIT
