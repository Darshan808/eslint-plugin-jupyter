/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from 'eslint';
import pluginActivationArgs from '../src/rules/plugin-activation-args';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('plugin-activation-args', pluginActivationArgs, {
  valid: [
    {
      // Only requires token
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          activate: (app: JupyterFrontEnd, tracker: INotebookTracker, rendermime: IRenderMimeRegistry) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Both requires and optional token
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          optional: [IToolbarWidgetRegistry, ITranslator],
          activate: async (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            rendermime: IRenderMimeRegistry,
            toolbarRegistry: IToolbarWidgetRegistry | null,
            translator: ITranslator | null,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Only optional tokens
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [ISettingRegistry, ITranslator],
          activate: (
            app: JupyterFrontEnd,
            settingRegistry: ISettingRegistry | null,
            translator: ITranslator | null,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // No requires or optional
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          activate: (app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Empty requires and optional arrays
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [],
          optional: [],
          activate: (app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Multiple required and optional tokens
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry, ILabShell],
          'optional': [IToolbarWidgetRegistry, ITranslator, ISettingRegistry, ICommandPalette],
          activate: async (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            rendermime: IRenderMimeRegistry,
            shell: ILabShell,
            toolbarRegistry: IToolbarWidgetRegistry | null,
            translator: ITranslator | null,
            settingRegistry: ISettingRegistry | null,
            palette: ICommandPalette | null,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Multiple required and optional tokens
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          optional: [IToolbarWidgetRegistry],
          otherThanActivate: async (
            random: ITest
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Multiple required and optional tokens
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          optional: [IToolbarWidgetRegistry],
          activate: true
        };
      `
    },
     {
      code: `
        const plugin = {
          id: 'test-plugin',
          requires: [],
          activate: () => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Sepcial case but valid
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          activate: () => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // JupyterLab and some other types are allowed
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          activate: (app: JupyterLab) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // ServiceManagerPlugin must use null as first activate argument
      code: `
        const plugin: ServiceManagerPlugin<void> = {
          id: 'test-service-manager-plugin',
          requires: [TestToken],
          activate: (
            _: null,
            testToken: TestToken
          ) => {
            console.log('Activated');
          }
        };
      `
    },
  ],

  invalid: [
    {
      // Arguments in wrong order (requires)
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          activate: (app: JupyterFrontEnd, rendermime: IRenderMimeRegistry, tracker: INotebookTracker) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'mismatchedOrder',
          data: { arg: 'rendermime' }
        },
        {
          messageId: 'mismatchedOrder',
          data: { arg: 'tracker' }
        }
      ]
    },
    {
      // Missing argument from requires
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'wrongArgumentCount'
        },
        {
          messageId: 'missingArgument',
          data: { token: 'IRenderMimeRegistry' }
        }
      ]
    },
    {
      // Extra argument not in requires/optional
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          activate: (app: JupyterFrontEnd, tracker: INotebookTracker, extraArg: ISomething) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'wrongArgumentCount'
        },
        {
          messageId: 'extraArgument',
          data: { arg: 'extraArg' }
        }
      ]
    },
    {
      // app is not first argument
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          activate: (tracker: INotebookTracker, app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'appNotFirst',
          data: { arg: 'tracker', allowedNames: '"app", "_app", "_"' }
        }
      ]
    },
    {
      // Wrong order in requires and optional mix
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          optional: [IToolbarWidgetRegistry, ITranslator],
          activate: async (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            translator: ITranslator | null,
            rendermime: IRenderMimeRegistry,
            toolbarRegistry: IToolbarWidgetRegistry | null,
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'mismatchedOrder',
          data: { arg: 'translator' }
        },
        {
          messageId: 'mismatchedOrder',
          data: { arg: 'rendermime' }
        },
        {
          messageId: 'mismatchedOrder',
          data: { arg: 'toolbarRegistry' }
        }
      ]
    },
    {
      // Missing optional argument
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          optional: [IToolbarWidgetRegistry, ITranslator],
          activate: async (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            toolbarRegistry: IToolbarWidgetRegistry | null,
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'wrongArgumentCount'
        },
        {
          messageId: 'missingArgument',
          data: { token: 'ITranslator' }
        }
      ]
    },
    {
      // Too many arguments
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          activate: (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            extraArg1: ISomething,
            extraArg2: IAnother,
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'wrongArgumentCount'
        },
        {
          messageId: 'extraArgument',
          data: { arg: 'extraArg1' }
        },
        {
          messageId: 'extraArgument',
          data: { arg: 'extraArg2' }
        }
      ]
    },
    {
      // No requires or optional but extra token(s)
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          activate: (app: JupyterFrontEnd, test:ISomething) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'wrongArgumentCount'
        },
        {
          messageId: 'extraArgument',
          data: { arg: 'test' }
        }
      ]
    },
    {
      // First argument has incompatible type
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          activate: (app: JupyterFrontEndPlugin) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'invalidAppType',
          data: { arg: 'app', type: 'JupyterFrontEndPlugin' }
        }
      ]
    },
    {
      // ServiceManagerPlugin first argument must be null literal
      code: `
        const plugin: ServiceManagerPlugin<void> = {
          id: 'test-service-manager-plugin',
          optional: [TestToken],
          activate: (
            app: JupyterFrontEnd,
            testToken: TestToken
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'serviceManagerFirstArgNotNull',
          data: { arg: 'app' }
        }
      ]
    },
  ]
});
