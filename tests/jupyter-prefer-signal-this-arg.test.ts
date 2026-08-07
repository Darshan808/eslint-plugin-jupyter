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
          dispose(): void {
            Signal.clearData(this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // No receiver-based cleanup anywhere in the class: adding a thisArg
        // would change disconnect matching for no benefit — do not flag
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(sender => this.refresh(sender));
          }
          refresh(sender: unknown): void {}
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
          dispose(): void {
            Signal.clearData(this);
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
          dispose(): void {
            Signal.clearData(this);
          }
        }
      `
      },
      {
        // A matching one-argument disconnect(callback) is a working
        // teardown — Lumino matches (signal, slot, thisArg) exactly, so
        // adding \`, this\` to the connect would break it
        code: `
        class Factory {
          createNew(widget: any, context: any): void {
            const updateTitle = () => {
              this.setTitle(context.localPath);
            };
            context.pathChanged.connect(updateTitle);
            widget.disposed.connect(() => {
              context.pathChanged.disconnect(updateTitle);
            });
          }
          dispose(): void {
            Signal.clearData(this);
          }
          setTitle(title: string): void {}
        }
      `
      },
      {
        // Same guard for \`this.x\` member callbacks
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged);
          }
          unwire(model: any): void {
            model.changed.disconnect(this._onChanged);
          }
          dispose(): void {
            Signal.clearData(this);
          }
          private _onChanged = (): void => {
            this.refresh();
          };
          refresh(): void {}
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
          dispose(): void {
            Signal.clearData(this);
          }
          refresh(): void {}
        }
      `
      }
    ],
    invalid: [
      {
        // Inline arrow in a class that cleans up with Signal.clearData(this):
        // the connection has no receiver, so clearData cannot remove it
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(sender => this.refresh(sender));
          }
          dispose(): void {
            Signal.clearData(this);
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
          dispose(): void {
            Signal.clearData(this);
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
        // Arrow-function property in a class that disconnects by receiver
        // elsewhere — this connection is inconsistent with that strategy
        code: `
        class Watcher {
          private _model: any;
          wire(model: any): void {
            this._model = model;
            model.changed.connect(this._onChanged);
          }
          dispose(): void {
            this._model.changed.disconnect(this._onOther, this);
          }
          private _onChanged = (): void => {
            this.refresh();
          };
          private _onOther(): void {}
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
          private _model: any;
          wire(model: any): void {
            this._model = model;
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            this._model.changed.disconnect(this._onOther, this);
          }
          private _onChanged = (): void => {
            this.refresh();
          };
          private _onOther(): void {}
          refresh(): void {}
        }
      `
              }
            ]
          }
        ]
      },
      {
        // Method that never uses \`this\`, class cleans up via clearData
        code: `
        class Watcher {
          wire(model: any): void {
            model.changed.connect(this._onChanged);
          }
          dispose(): void {
            Signal.clearData(this);
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
          dispose(): void {
            Signal.clearData(this);
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
        // Member not found in the class (possibly inherited), class cleans
        // up via clearData
        code: `
        class Watcher extends Base {
          wire(model: any): void {
            model.changed.connect(this._onInherited);
          }
          dispose(): void {
            Signal.clearData(this);
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
          dispose(): void {
            Signal.clearData(this);
          }
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
        import { Signal } from '@lumino/signaling';
        import { NotASignal } from './fixtures/not-a-signal';
        class Wiring {
          wire(node: NotASignal): void {
            node.connect(() => this.refresh());
          }
          dispose(): void {
            Signal.clearData(this);
          }
          refresh(): void {}
        }
      `
    },
    {
      // Non-Widget base and no receiver-based cleanup of its own — the
      // class does not rely on receiver matching, so do not flag
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal } from '@lumino/signaling';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Base {}
        class Watcher extends Base {
          wire(model: IModel): void {
            model.updates.connect(() => this.refresh());
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
        import { ISignal, Signal } from '@lumino/signaling';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Watcher {
          wire(model: IModel): void {
            model.updates.connect(() => this.refresh());
          }
          dispose(): void {
            Signal.clearData(this);
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
        import { ISignal, Signal } from '@lumino/signaling';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Watcher {
          wire(model: IModel): void {
            model.updates.connect(() => this.refresh(), this);
          }
          dispose(): void {
            Signal.clearData(this);
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
      // Extends Lumino's Widget: the inherited dispose() calls
      // Signal.clearData(this), so unreceivered connections leak
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal } from '@lumino/signaling';
        import { Widget } from '@lumino/widgets';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Panel extends Widget {
          wire(model: IModel): void {
            model.updates.connect(() => this.update());
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
        import { ISignal } from '@lumino/signaling';
        import { Widget } from '@lumino/widgets';
        interface IModel {
          updates: ISignal<IModel, void>;
        }
        class Panel extends Widget {
          wire(model: IModel): void {
            model.updates.connect(() => this.update(), this);
          }
        }
      `
            }
          ]
        }
      ]
    }
  ]
});
