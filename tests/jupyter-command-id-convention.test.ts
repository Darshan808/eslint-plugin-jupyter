/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import commandIdConvention from '../src/rules/command-id-convention';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

const typeAwareTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      projectService: {
        allowDefaultProject: ['tests/*.ts'],
        defaultProject: 'tsconfig.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

ruleTester.run('command-id-convention', commandIdConvention, {
  valid: [
    {
      code: `
        app.commands.addCommand('my-extension:open', {
          execute: () => {}
        });
      `
    },
    {
      // Scoped package names are namespaces too.
      code: `
        app.commands.addCommand('@my-org/my-extension:open', {
          execute: () => {}
        });
      `
    },
    {
      // Only the first colon separates the namespace from the name.
      code: `
        app.commands.addCommand('notebook:run-cell:and-select-next', {
          execute: () => {}
        });
      `
    },
    {
      code: `
        namespace CommandIDs {
          export const open = 'my-extension:open';
        }
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `
    },
    {
      code: `
        const CommandIDs = {
          open: 'my-extension:open'
        } as const;
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `
    },
    {
      code: `
        enum CommandIDs {
          open = 'my-extension:open'
        }
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `
    },
    {
      code: `
        const NAMESPACE = 'my-extension';
        app.commands.addCommand(\`\${NAMESPACE}:open\`, {
          execute: () => {}
        });
      `
    },
    {
      // An ID that cannot be resolved statically is not checked.
      code: `
        declare function makeId(): string;
        app.commands.addCommand(makeId(), {
          execute: () => {}
        });
      `
    },
    {
      // A namespace member without an initializer is not checked.
      code: `
        declare namespace CommandIDs {
          export const open: string;
        }
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `
    },
    {
      // Without type information an imported constant cannot be resolved.
      code: `
        import { CommandIDs } from './tokens';
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `
    },
    {
      // A single argument is not a command registration.
      code: `
        menu.addCommand('open');
      `
    }
  ],
  invalid: [
    {
      code: `
        app.commands.addCommand('open', {
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingNamespace',
          data: { commandId: 'open' },
          line: 2,
          column: 33
        }
      ]
    },
    {
      // Other separators do not create a namespace.
      code: `
        commands.addCommand('my-extension.open', {
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'missingNamespace' }]
    },
    {
      code: `
        namespace CommandIDs {
          export const open = 'open-file';
        }
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'missingNamespace',
          data: { commandId: 'open-file' },
          line: 5
        }
      ]
    },
    {
      // Merged namespace blocks are all searched.
      code: `
        namespace CommandIDs {
          export const open = 'my-extension:open';
        }
        namespace CommandIDs {
          export const close = 'close';
        }
        app.commands.addCommand(CommandIDs.close, {
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'missingNamespace', data: { commandId: 'close' } }]
    },
    {
      code: `
        const CommandIDs = {
          open: 'open'
        };
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'missingNamespace' }]
    },
    {
      code: `
        enum CommandIDs {
          open = 'open'
        }
        app.commands.addCommand(CommandIDs.open, {
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'missingNamespace' }]
    },
    {
      code: `
        const id = 'open';
        app.commands.addCommand(id, {
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'missingNamespace' }]
    },
    {
      code: `
        app.commands.addCommand(':open', {
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'emptySegment',
          data: { commandId: ':open', segment: 'namespace' }
        }
      ]
    },
    {
      code: `
        app.commands.addCommand('my-extension:', {
          execute: () => {}
        });
      `,
      errors: [
        {
          messageId: 'emptySegment',
          data: { commandId: 'my-extension:', segment: 'name' }
        }
      ]
    }
  ]
});

typeAwareTester.run('command-id-convention (type-aware)', commandIdConvention, {
  valid: [
    {
      code: `
        declare const id: 'my-extension:open';
        app.commands.addCommand(id, {
          execute: () => {}
        });
      `,
      filename: 'tests/type-aware-fixture.ts'
    },
    {
      // A plain \`string\` carries no value to check.
      code: `
        declare const id: string;
        app.commands.addCommand(id, {
          execute: () => {}
        });
      `,
      filename: 'tests/type-aware-fixture.ts'
    }
  ],
  invalid: [
    {
      code: `
        declare const id: 'open';
        app.commands.addCommand(id, {
          execute: () => {}
        });
      `,
      filename: 'tests/type-aware-fixture.ts',
      errors: [{ messageId: 'missingNamespace', data: { commandId: 'open' } }]
    }
  ]
});
