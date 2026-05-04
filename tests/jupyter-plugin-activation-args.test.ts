/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import pluginActivationArgs from '../src/rules/plugin-activation-args';

const nonTypeAwareTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['tests/*.ts'],
        defaultProject: 'tsconfig.test.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

nonTypeAwareTester.run('plugin-activation-args (non-type-aware)', pluginActivationArgs, {
  valid: [],
  invalid: [
    // This same case is in valid cases for the type-aware tester
    {
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { IDebuggerSidebar, IDebugger } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [IDebuggerSidebar],
          activate: (app: JupyterFrontEnd, sidebar: IDebugger.ISidebar) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'unresolvableTokenType',
          data: { token: 'IDebuggerSidebar' }
        }
      ]
    },
  ]
});

ruleTester.run('plugin-activation-args', pluginActivationArgs, {
  valid: [
    {
      // Only requires token, not provided type_stubs as the names match
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, IRenderMimeRegistry, IToolbarWidgetRegistry, ITranslator } from './fixtures/types';
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
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISettingRegistry, ITranslator } from './fixtures/types';
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, IRenderMimeRegistry, ILabShell, IToolbarWidgetRegistry, ITranslator, ISettingRegistry, ICommandPalette } from './fixtures/types';
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
      // Namespace pattern with type info
      filename: 'tests/type-aware-fixture.ts',
      code: `
       import { IDebugger, IDebuggerSidebar } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [IDebuggerSidebar],
          activate: (
            app: JupyterFrontEnd,
            sidebar: IDebugger.ISidebar,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Tokens with qualified names (JupyterFrontEnd.IPaths)
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, IRenderMimeRegistry, ILabShell, IToolbarWidgetRegistry, ITranslator, ISettingRegistry, ICommandPalette } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry, ILabShell, JupyterFrontEnd.IPaths],
          'optional': [IToolbarWidgetRegistry, ITranslator, ISettingRegistry, ICommandPalette],
          activate: async (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            rendermime: IRenderMimeRegistry,
            shell: ILabShell,
            paths: JupyterFrontEnd.IPaths,
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
      // No active method, should not report any issues
      filename: 'tests/type-aware-fixture.ts',
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
      // activate is not a function, should not report any issues
      filename: 'tests/type-aware-fixture.ts',
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
      // Special case but valid
      filename: 'tests/type-aware-fixture.ts',
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
      // Similar to above one but with empty requires.
      filename: 'tests/type-aware-fixture.ts',
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
      // JupyterLab and some other types are allowed
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
    {
    // Namespace pattern with optional token
    filename: 'tests/type-aware-fixture.ts',
    code: `
      import { IDebugger, IDebuggerSidebar } from './fixtures/types';
      const plugin: JupyterFrontEndPlugin<void> = {
        id: 'test-plugin',
        requires: [INotebookTracker],
        optional: [IDebuggerSidebar],
        activate: (
          app: JupyterFrontEnd,
          tracker: INotebookTracker,
          debuggerSidebar: IDebugger.ISidebar | null,
        ) => {
          console.log('Activated');
        }
      };
    `
    },
    {
      // Cross-file: token and interface declared in a separate .d.ts.
    filename: 'tests/type-aware-fixture.ts',
    code: `
      import { IDebugger, IDebuggerSidebar, INotebookTracker } from './fixtures/types';
      declare class JupyterFrontEnd {}
      declare class JupyterFrontEndPlugin<T> {}
      const plugin: JupyterFrontEndPlugin<void> = {
        id: 'test-plugin',
        requires: [INotebookTracker, IDebuggerSidebar],
        activate: (
          app: JupyterFrontEnd,
          tracker: INotebookTracker,
          debuggerSidebar: IDebugger.ISidebar,
        ) => {
          console.log('Activated');
        }
      };
    `
    },
    {
      // Type alias that resolves to T | null is acceptable (type-checker path)
      filename: 'tests/type-aware-fixture.ts',
      code: `
      import { IToolbarWidgetRegistry } from './fixtures/types';
        type NullableToolbar = IToolbarWidgetRegistry | null;
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [IToolbarWidgetRegistry],
          activate: (
            app: JupyterFrontEnd,
            toolbarRegistry: NullableToolbar,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Optional token with | undefined is acceptable
      filename: 'tests/type-aware-fixture.ts',
      code: `
       import { ISettingRegistry } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [ISettingRegistry],
          activate: (
            app: JupyterFrontEnd,
            settingRegistry: ISettingRegistry | undefined,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Reverse ordering
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISettingRegistry } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [ISettingRegistry],
          activate: (
            app: JupyterFrontEnd,
            settingRegistry: undefined | ISettingRegistry,
          ) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      // Optional token with ?: syntax (implies | undefined) is acceptable
      filename: 'tests/type-aware-fixture.ts',
      code: `
      import { ISettingRegistry, ITranslator } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [ISettingRegistry, ITranslator],
          activate: (
            app: JupyterFrontEnd,
            settingRegistry?: ISettingRegistry,
            translator?: ITranslator,
          ) => {
            console.log('Activated');
          }
        };
      `
    }
  ],

  invalid: [
    {
      // Arguments in wrong order (requires)
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, ITranslator } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, ITranslator],
          activate: (app: JupyterFrontEnd, translator: ITranslator, tracker: INotebookTracker) => {
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
          data: { arg: 'tracker' }
        }
      ]
    },
    {
      // Missing argument from requires
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, ITranslator, IRenderMimeRegistry, IToolbarWidgetRegistry } from './fixtures/types';
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
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, ITranslator, IToolbarWidgetRegistry } from './fixtures/types';
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
      filename: 'tests/type-aware-fixture.ts',
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
          data: { arg: 'JupyterFrontEnd' }
        }
      ]
    },
    {
      // Incorrect type (null)
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          activate: (app: JupyterFrontEnd, tracker: null) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'incorrectType',
          data: { arg: 'tracker', type: null, expected: 'INotebookTracker' }
        }
      ]
    },
    {
      // Incorrect type
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, IRenderMimeRegistry } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          activate: (app: JupyterFrontEnd, tracker: IDocumentTracker, rendermime: IRenderMimeRegistry) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'incorrectType',
          data: { arg: 'tracker', type: 'IDocumentTracker', expected: 'INotebookTracker' }
        }
      ]
    },
    {
      // Incorrect type (without stubs results in unresolved tokens)
      filename: 'tests/type-aware-fixture.ts',
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker, IRenderMimeRegistry],
          activate: (app: JupyterFrontEnd, tracker: IDocumentTracker, rendermime: IRenderMimeRegistry) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'unresolvableTokenType',
          data: { token: 'INotebookTracker'}
        }
      ]
    },
    {
    // Namespace pattern but wrong order
    filename: 'tests/type-aware-fixture.ts',
    code: `
      import { IDebugger, IDebuggerSidebar, INotebookTracker } from './fixtures/types';
      const plugin: JupyterFrontEndPlugin<void> = {
        id: 'test-plugin',
        requires: [INotebookTracker, IDebuggerSidebar],
        activate: (
          app: JupyterFrontEnd,
          debuggerSidebar: IDebugger.ISidebar,
          tracker: INotebookTracker,
        ) => {
          console.log('Activated');
        }
      };
    `,
      errors: [
        { messageId: 'mismatchedOrder', data: { arg: 'debuggerSidebar' } },
        { messageId: 'mismatchedOrder', data: { arg: 'tracker' } }
      ]
    },
    {
      // Optional token without | null
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { IToolbarWidgetRegistry } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          optional: [IToolbarWidgetRegistry],
          activate: (
            app: JupyterFrontEnd,
            toolbarRegistry: IToolbarWidgetRegistry,
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'optionalNotNullable',
          data: { arg: 'toolbarRegistry', type: 'IToolbarWidgetRegistry' }
        }
      ]
    },
    {
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { INotebookTracker, IToolbarWidgetRegistry, ITranslator } from './fixtures/types';
        const plugin: JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          requires: [INotebookTracker],
          optional: [IToolbarWidgetRegistry, ITranslator],
          activate: (
            app: JupyterFrontEnd,
            tracker: INotebookTracker,
            toolbarRegistry: IToolbarWidgetRegistry,
            translator: ITranslator | null,
          ) => {
            console.log('Activated');
          }
        };
      `,
      errors: [
        {
          messageId: 'optionalNotNullable',
          data: { arg: 'toolbarRegistry', type: 'IToolbarWidgetRegistry' }
        }
      ]
    }
  ]
});
