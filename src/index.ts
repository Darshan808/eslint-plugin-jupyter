import pluginActivationArgs from './rules/plugin-activation-args';
import commandDescribedBy from './rules/command-described-by';
import pluginDescription from './rules/plugin-description';

const plugin = {
  rules: {
    'plugin-activation-args': pluginActivationArgs,
    'command-described-by': commandDescribedBy,
    'plugin-description': pluginDescription,
  },
  configs: {
    recommended: {
      files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
      rules: {
        'jupyter/plugin-activation-args': 'error',
        'jupyter/command-described-by': 'error',
        'jupyter/plugin-description': 'error',
      },
    },
  },
};

export = plugin;
