/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as path from 'path';
import requireSignalCleanup from '../src/rules/require-signal-cleanup';

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
  'require-signal-cleanup (non-type-aware)',
  requireSignalCleanup,
  {
    valid: [
      {
        // Signal.clearData(this) in dispose()
        code: `
        class Watcher {
          constructor(model: any) {
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
        // Signal.disconnectReceiver(this)
        code: `
        class Watcher {
          constructor(model: any) {
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            Signal.disconnectReceiver(this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Signal.disconnectAll(this)
        code: `
        class Watcher {
          constructor(model: any) {
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            Signal.disconnectAll(this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Renamed Signal import still recognized
        code: `
        import { Signal as Sig } from '@lumino/signaling';
        class Watcher {
          constructor(model: any) {
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            Sig.clearData(this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Explicit matching .disconnect() elsewhere in the class
        code: `
        class Watcher {
          private _model: any;
          constructor(model: any) {
            this._model = model;
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            this._model.changed.disconnect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Disconnect-before-reconnect idiom counts as cleanup
        code: `
        class Observer {
          private _target: any = null;
          observe(target: any): void {
            this.stopObserving();
            this._target = target;
            target.changed.connect(this._onChanged, this);
          }
          stopObserving(): void {
            if (this._target) {
              this._target.changed.disconnect(this._onChanged, this);
            }
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // connect() return value assigned
        code: `
        class Watcher {
          private _connected: boolean;
          constructor(model: any) {
            this._connected = model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // connect() return value passed to a disposable collector
        code: `
        class Watcher {
          private _disposables: any;
          constructor(model: any) {
            this._disposables.add(model.changed.connect(this._onChanged, this));
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Cleanup wired through a disposed signal
        code: `
        class Watcher {
          constructor(model: any, content: any) {
            model.changed.connect(this._onChanged, this);
            content.disposed.connect(() => {
              model.changed.disconnect(this._onChanged, this);
            });
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Disposal delegated via this.dispose() somewhere in the class
        code: `
        class Watcher {
          constructor(model: any, content: any) {
            model.changed.connect(this._onChanged, this);
            content.onClose(() => this.dispose());
          }
          dispose(): void {}
          private _onChanged(): void {}
        }
      `
      },
      {
        // Class extends a base class — inherited dispose() may clean up
        code: `
        class Panel extends Widget {
          constructor(model: any) {
            super();
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `
      },
      {
        // Only one argument — not this rule's domain
        code: `
        class Watcher {
          constructor(model: any) {
            model.changed.connect(() => console.log('changed'));
          }
        }
      `
      },
      {
        // Second argument is not \`this\` — untraceable receiver
        code: `
        class Coordinator {
          wire(model: any, handler: any): void {
            model.changed.connect(handler.onChanged, handler);
          }
        }
      `
      },
      {
        // No enclosing class (plugin activate) — app-lifetime connection
        code: `
        const plugin = {
          id: 'test',
          activate: (app: any, settings: any) => {
            settings.changed.connect(onSettingsChanged, settings);
          }
        };
        function onSettingsChanged(): void {}
      `
      },
      {
        // additionalCleanupMethods option
        code: `
        class Observer {
          observe(target: any): void {
            target.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            this._teardown();
          }
          private _teardown(): void {}
          private _onChanged(): void {}
        }
      `,
        options: [{ additionalCleanupMethods: ['_teardown'] }]
      }
    ],
    invalid: [
      {
        // Syntactic fallback fires without type information
        code: `
        class Watcher {
          constructor(model: any) {
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      },
      {
        // Private method callback
        code: `
        class Watcher {
          constructor(model: any) {
            model.changed.connect(this.#onChanged, this);
          }
          #onChanged(): void {}
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      },
      {
        // Inner class flagged even though outer class has cleanup
        code: `
        class Outer {
          dispose(): void {
            Signal.clearData(this);
          }
          make(model: any): unknown {
            return new (class Inner {
              constructor() {
                model.changed.connect(this._onChanged, this);
              }
              _onChanged(): void {}
            })();
          }
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      },
      {
        // A nested class's disconnect does not launder the outer class
        code: `
        class Outer {
          constructor(model: any) {
            model.changed.connect(this._onChanged, this);
          }
          make(): unknown {
            return new (class Inner {
              detach(model: any): void {
                model.changed.disconnect(this._onInner, this);
              }
              _onInner(): void {}
            })();
          }
          private _onChanged(): void {}
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      },
      {
        // connect() inside an arrow inside a method still belongs to the class
        code: `
        class Watcher {
          start(model: any): void {
            requestAnimationFrame(() => {
              model.changed.connect(this._onChanged, this);
            });
          }
          private _onChanged(): void {}
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      },
      {
        // Multiple uncleaned connections — one report per call
        code: `
        class Watcher {
          constructor(model: any, session: any) {
            model.changed.connect(this._onChanged, this);
            session.kernelChanged.connect(this._onKernel, this);
          }
          private _onChanged(): void {}
          private _onKernel(): void {}
        }
      `,
        errors: [
          { messageId: 'missingSignalCleanup' },
          { messageId: 'missingSignalCleanup' }
        ]
      },
      {
        // Unrelated 1-arg connect elsewhere does not mask the 2-arg leak
        code: `
        class AudioWatcher {
          constructor(model: any, node: any, dest: any) {
            node.connect(dest);
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `,
        errors: [{ messageId: 'missingSignalCleanup' }]
      }
    ]
  }
);

ruleTester.run('require-signal-cleanup', requireSignalCleanup, {
  valid: [
    {
      // Receiver's type resolves to a non-signal — do not flag
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { NotASignal } from './fixtures/signaling';
        class Wiring {
          constructor(node: NotASignal) {
            node.connect(this._onEvent, this);
          }
          private _onEvent(): void {}
        }
      `
    },
    {
      // Real ISignal receiver with clearData cleanup
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal, Signal } from './fixtures/signaling';
        interface IModel {
          changed: ISignal<IModel, void>;
        }
        class Watcher {
          constructor(model: IModel) {
            model.changed.connect(this._onChanged, this);
          }
          dispose(): void {
            Signal.clearData(this);
          }
          private _onChanged(): void {}
        }
      `
    }
  ],
  invalid: [
    {
      // Receiver typed as ISignal, no cleanup anywhere
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal } from './fixtures/signaling';
        interface IModel {
          changed: ISignal<IModel, void>;
        }
        class Watcher {
          constructor(model: IModel) {
            model.changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `,
      errors: [{ messageId: 'missingSignalCleanup' }]
    },
    {
      // Receiver typed as concrete Signal, no cleanup anywhere
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { Signal } from './fixtures/signaling';
        class Watcher {
          constructor(changed: Signal<unknown, void>) {
            changed.connect(this._onChanged, this);
          }
          private _onChanged(): void {}
        }
      `,
      errors: [{ messageId: 'missingSignalCleanup' }]
    }
  ]
});
