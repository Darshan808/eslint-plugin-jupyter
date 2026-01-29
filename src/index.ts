import jupyterPluginActivationArgs from './rules/jupyter-plugin-activation-args';
import jupyterCommandDescribedBy from './rules/jupyter-command-described-by';
import jupyterPluginDescription from './rules/jupyter-plugin-description';

const plugin = {
  rules: {
    'jupyter-plugin-activation-args': jupyterPluginActivationArgs,
    'jupyter-command-described-by': jupyterCommandDescribedBy,
    'jupyter-plugin-description': jupyterPluginDescription,
  },
  configs: {
    recommended: {
      files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
      plugins: {
        dp: {
          rules: {
            'jupyter-plugin-activation-args': jupyterPluginActivationArgs,
            'jupyter-command-described-by': jupyterCommandDescribedBy,
            'jupyter-plugin-description': jupyterPluginDescription,
          },
        },
      },
      rules: {
        'dp/jupyter-plugin-activation-args': 'error',
        'dp/jupyter-command-described-by': 'error',
        'dp/jupyter-plugin-description': 'error',
      },
    },
  },
};

export = plugin;
