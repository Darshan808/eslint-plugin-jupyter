import { RuleTester } from 'eslint';
import jupyterPluginDescription from '../src/rules/jupyter-plugin-description';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('jupyter-plugin-description', jupyterPluginDescription, {
  valid: [
    {
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'jupyterlab-notify:plugin',
          description: 'Enhanced cell execution notifications for JupyterLab',
          autoStart: true,
          activate: (app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `,
    },
    {
      code: `
        const description = 'My plugin description';
        const test: JupyterFrontEndPlugin<void> = {
          id: 'var-desc-plugin',
          description: description,
          activate: (app: JupyterFrontEnd) => {}
        };
      `,
    },
  ],

  invalid: [
    {
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'jupyterlab-notify:plugin',
          autoStart: true,
          activate: (app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'missingDescription',
        },
      ],
    },
    {
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'empty-desc-plugin',
          description: '',
          activate: (app: JupyterFrontEnd) => {}
        };
      `,
      errors: [
        {
          messageId: 'missingDescription',
        },
      ],
    }
  ],
});
