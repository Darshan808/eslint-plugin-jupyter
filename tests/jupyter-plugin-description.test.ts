import { RuleTester } from 'eslint';
import pluginDescription from '../src/rules/plugin-description';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('plugin-description', pluginDescription, {
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
