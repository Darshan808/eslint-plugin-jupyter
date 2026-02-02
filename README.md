# eslint-plugin-jupyter

ESLint plugin for Jupyter core and extensions with early error catching and best practices enforcement.

## Installation

```bash
npm install --save-dev eslint-plugin-jupyter
```

## Rules

- `command-described-by` - Ensure JupyterLab commands include describedBy property
- `plugin-activation-args` - Ensure JupyterLab plugin activation function arguments match requires and optional tokens in order
- `plugin-description` - Ensure JupyterLab plugins have a description property

## Usage

Add `jupyter` to the plugins section of your ESLint configuration:

```javascript
// eslint.config.js
const jupyterPlugin = require('eslint-plugin-jupyter');

module.exports = [
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

MIT
