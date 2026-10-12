/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import pluginDescription from '../src/rules/plugin-description';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('plugin-description', pluginDescription, {
  valid: [
    {
      code: `
        const plugin: JupyterFrontEndPlugin<void> = {
          'id': 'jupyterlab-notify:plugin',
          'description': 'Enhanced cell execution notifications for JupyterLab',
          autoStart: true,
          activate: (app: JupyterFrontEnd) => {
            console.log('Activated');
          }
        };
      `
    },
    {
      code: `
        const description = 'My plugin description';
        const test: JupyterFrontEndPlugin<void> = {
          id: 'var-desc-plugin',
          description: description,
          activate: (app: JupyterFrontEnd) => {}
        };
      `
    },
    {
      code: `
        const plugins: JupyterFrontEndPlugin<any>[] = [
          {
            id: 'plugin-1',
            description: 'First plugin',
            autoStart: true,
            activate: () => {}
          },
          {
            id: 'plugin-2',
            description: 'Second plugin',
            autoStart: true,
            activate: () => {}
          }
        ];
      `
    },
    {
      code: `
        const plugins: Array<JupyterFrontEndPlugin<unknown>> = [
          {
            id: 'plugin-1',
            description: 'First plugin',
            activate: () => {}
          }
        ];
      `
    },
    {
      code: `
        const plugins = [
          {
            id: 'plugin-1',
            description: 'First plugin',
            activate: () => {}
          }
        ] as JupyterFrontEndPlugin<any>[];
      `
    },
    {
      code: `
        export default [
          {
            id: 'plugin-1',
            description: 'First plugin',
            activate: () => {}
          }
        ] as JupyterFrontEndPlugin<any>[];
      `
    },
    {
      // Referencing an identifier in array does not duplicate errors
      code: `
        const plugin1: JupyterFrontEndPlugin<void> = {
          id: 'plugin-1',
          description: 'First plugin',
          activate: () => {}
        };
        const plugins: JupyterFrontEndPlugin<any>[] = [plugin1];
      `
    },
    {
      // Non-plugin array should be ignored
      code: `
        const commands = [
          { id: 'cmd-1', label: 'Command 1' }
        ];
      `
    },
    {
      // Generic wrapper like Record<string, JupyterFrontEndPlugin<any>> should not be treated as a plugin container
      code: `
        const registry: Record<string, JupyterFrontEndPlugin<any>> = {
          first: {
            id: 'first',
            description: 'ok'
          }
        };
      `
    },
    {
      // Map/Set should not be treated as plugin containers
      code: `
        const pluginMap: Map<string, JupyterFrontEndPlugin<any>> = new Map();
      `
    },
    {
      // Tuple with rest element
      code: `
        const plugins: [JupyterFrontEndPlugin<any>, ...JupyterFrontEndPlugin<any>[]] = [
          {
            id: 'plugin-1',
            description: 'First plugin',
            activate: () => {}
          },
          {
            id: 'plugin-2',
            description: 'Second plugin',
            activate: () => {}
          }
        ];
      `
    },
    {
      code: `
        const plugin: app.JupyterFrontEndPlugin<void> = {
          id: 'test-plugin',
          description: 'A namespaced plugin',
          activate: () => {}
        };
      `
    },
    {
      code: `
        const plugin: Partial<JupyterFrontEndPlugin<void>> = {
          id: 'test-plugin',
          description: 'A partial plugin',
          activate: () => {}
        };
      `
    },
    {
      // Readonly array and tuple type operators
      code: `
        const plugins: readonly JupyterFrontEndPlugin<any>[] = [
          {
            id: 'readonly-plugin',
            description: 'Readonly plugin',
            activate: () => {}
          }
        ];
        const tuplePlugins: readonly [JupyterFrontEndPlugin<any>] = [
          {
            id: 'readonly-tuple-plugin',
            description: 'Readonly tuple plugin',
            activate: () => {}
          }
        ];
        const optionalTuple: [JupyterFrontEndPlugin<any>?] = [
          {
            id: 'optional-tuple-plugin',
            description: 'Optional tuple plugin',
            activate: () => {}
          }
        ];
      `
    },
    {
      code: `
        function make(): JupyterFrontEndPlugin<void> {
          return {
            id: 'factory-plugin',
            description: 'Factory plugin description',
            activate: () => {}
          };
        }
      `
    },
    {
      code: `
        function make(): JupyterFrontEndPlugin<void>[] {
          return [
            {
              id: 'factory-array-plugin',
              description: 'Factory array plugin description',
              activate: () => {}
            }
          ];
        }
      `
    }
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
          data: { pluginId: ' "jupyterlab-notify:plugin"' }
        }
      ]
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
          messageId: 'emptyDescription',
          data: { pluginId: ' "empty-desc-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugins: JupyterFrontEndPlugin<any>[] = [
          {
            id: 'plugin-missing-desc',
            autoStart: true,
            activate: () => {}
          }
        ];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "plugin-missing-desc"' }
        }
      ]
    },
    {
      code: `
        const plugins: JupyterFrontEndPlugin<any>[] = [
          {
            id: 'plugin-1',
            autoStart: true,
            activate: () => {}
          },
          {
            id: 'plugin-2',
            description: '   ',
            autoStart: true,
            activate: () => {}
          }
        ];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "plugin-1"' }
        },
        {
          messageId: 'emptyDescription',
          data: { pluginId: ' "plugin-2"' }
        }
      ]
    },
    {
      code: `
        const plugins: Array<JupyterFrontEndPlugin<unknown>> = [
          {
            id: 'array-plugin',
            activate: () => {}
          }
        ];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "array-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugins = [
          {
            id: 'cast-plugin',
            activate: () => {}
          }
        ] as JupyterFrontEndPlugin<any>[];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "cast-plugin"' }
        }
      ]
    },
    {
      code: `
        export default [
          {
            id: 'default-export-plugin',
            activate: () => {}
          }
        ] as JupyterFrontEndPlugin<any>[];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "default-export-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugin = {
          id: 'single-cast-plugin',
          activate: () => {}
        } as JupyterFrontEndPlugin<void>;
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "single-cast-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugins: [JupyterFrontEndPlugin<any>, ...JupyterFrontEndPlugin<any>[]] = [
          {
            id: 'tuple-plugin',
            activate: () => {}
          }
        ];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "tuple-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugins: readonly JupyterFrontEndPlugin<any>[] = [
          {
            id: 'readonly-plugin-missing-desc',
            activate: () => {}
          }
        ];
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "readonly-plugin-missing-desc"' }
        }
      ]
    },
    {
      code: `
        function make(): JupyterFrontEndPlugin<void> {
          return {
            id: 'factory-plugin',
            activate: () => {}
          };
        }
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "factory-plugin"' }
        }
      ]
    },
    {
      code: `
        function make(): JupyterFrontEndPlugin<void>[] {
          return [
            {
              id: 'factory-array-plugin',
              activate: () => {}
            }
          ];
        }
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "factory-array-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugin: app.JupyterFrontEndPlugin<void> = {
          id: 'namespaced-plugin',
          activate: () => {}
        };
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "namespaced-plugin"' }
        }
      ]
    },
    {
      code: `
        const plugin: Partial<JupyterFrontEndPlugin<void>> = {
          id: 'partial-plugin',
          activate: () => {}
        };
      `,
      errors: [
        {
          messageId: 'missingDescription',
          data: { pluginId: ' "partial-plugin"' }
        }
      ]
    }
  ]
});
