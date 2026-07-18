/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import preferSignalThisArg from '../src/rules/prefer-signal-this-arg';

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
        defaultProject: 'tsconfig.json'
      },
      tsconfigRootDir: path.resolve(__dirname, '..')
    }
  }
});

nonTypeAwareTester.run(
  'prefer-signal-this-arg (non-type-aware)',
  preferSignalThisArg,
  {
    valid: [
      {
        // thisArg already passed
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Two arguments with another receiver
        code: `
        class Coordinator {
          wire(model: any, handler: any): void {
            model.changed.connect(handler.onChanged, handler);
          }
        }
      `
      },
      {
        // Error rule's case: bare method reference that uses \`this\` —
        // reported by require-signal-this-arg, never by this rule
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged);
          }
          private _onChanged(): void {
            this.refresh();
          }
          refresh(): void {}
        }
      `
      },
      {
        // No enclosing class (plugin activate) — no \`this\` to pass
        code: `
        const plugin = {
          id: 'test',
          activate: (app: any, settings: any) => {
            settings.changed.connect(() => console.log('changed'));
          }
        };
      `
      },
      {
        // Disposal-wiring idiom on a disposed signal
        code: `
        class Watcher {
          constructor(content: any) {
            content.disposed.connect(() => this.dispose());
          }
          dispose(): void {}
        }
      `
      },
      {
        // Unknown receiver type and no signal-like name — skip
        code: `
        class Watcher {
          wire(node: any): void {
            node.connect(() => this.refresh());
          }
          refresh(): void {}
        }
      `
      },
      {
        // Zero arguments — not a callback registration
        code: `
        class Watcher {
          wire(node: any): void {
            node.connect();
          }
        }
      `
      }
    ],
    invalid: [
      {
        // Inline arrow using \`this\` — works at runtime, but the connection
        // has no receiver for clearData/disconnect
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(sender => this.refresh(sender));
          }
          refresh(sender: unknown): void {}
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(sender => this.refresh(sender), this);
          }
          refresh(sender: unknown): void {}
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Inline arrow not using \`this\`
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(() => console.log('changed'));
          }
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(() => console.log('changed'), this);
          }
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Inline function expression
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(function () {
              console.log('changed');
            });
          }
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(function () {
              console.log('changed');
            }, this);
          }
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Arrow-function class property — lexically bound, no runtime bug,
        // but still not clearable without a receiver
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged);
          }
          private _onChanged = (): void => {
            this.refresh();
          };
          refresh(): void {}
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged = (): void => {
            this.refresh();
          };
          refresh(): void {}
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Method that never uses \`this\`
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged);
          }
          private _onChanged(): void {
            console.log('changed');
          }
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {
            console.log('changed');
          }
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Member not found in the class (possibly inherited)
        code: `
        class Watcher extends Base {
          wire(model: any): void {
            model.changed.connect(this._onInherited);
          }
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher extends Base {
          wire(model: any): void {
            model.changed.connect(this._onInherited, this);
          }
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Free-variable callback
        code: `
        class Watcher {
          wire(model: any, handler: () => void): void {
            model.changed.connect(handler);
          }
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any, handler: () => void): void {
            model.changed.connect(handler, this);
          }
        }
      `
              }
            ]
          }
        ]
      },
      {
        // .bind(this) — bound for \`this\`, but the bound wrapper has a new
        // identity and no receiver, so it can never be disconnected
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged.bind(this));
          }
          private _onChanged(): void {
            this.refresh();
          }
          refresh(): void {}
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged.bind(this), this);
          }
          private _onChanged(): void {
            this.refresh();
          }
          refresh(): void {}
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Static context
        code: `
        class Watcher {
          static wire(model: any): void {
            model.changed.connect(() => Watcher.refresh());
          }
          static refresh(): void {}
        }
      `,
        errors: [
          {
            messageId: 'preferThisArg',
            suggestions: [
              {
                messageId: 'addThisArg',
                output: `
        class Watcher {
          static wire(model: any): void {
            model.changed.connect(() => Watcher.refresh(), this);
          }
          static refresh(): void {}
        }
      `
              }
            ]
          }
        ]
      }
    ]
  }
);

ruleTester.run('prefer-signal-this-arg', preferSignalThisArg, {
  valid: [
    {
      // Receiver type resolves to a non-signal — do not flag
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { NotASignal } from './fixtures/signaling';
        class Wiring {
          wire(node: NotASignal): void {
            node.connect(() => this.refresh());
          }
          refresh(): void {}
        }
      `
    }
  ],
  invalid: [
    {
      // Receiver typed as ISignal — flagged even without a signal-like name
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal } from './fixtures/signaling';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Watcher {
          wire(model: IModel): void {
            model.updates.connect(() => this.refresh());
          }
          refresh(): void {}
        }
      `,
      errors: [
        {
          messageId: 'preferThisArg',
          suggestions: [
            {
              messageId: 'addThisArg',
              output: `
        import { ISignal } from './fixtures/signaling';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Watcher {
          wire(model: IModel): void {
            model.updates.connect(() => this.refresh(), this);
          }
          refresh(): void {}
        }
      `
            }
          ]
        }
      ]
    }
  ]
});
