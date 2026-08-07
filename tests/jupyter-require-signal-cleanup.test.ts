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
        // Signal namespace cleanup call (clearData) in dispose()
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
        // Cleanup wired through a disposed signal: the .disconnect() call
        // inside the handler is the evidence
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
        // A stray this.dispose() call with an empty dispose() cleans up
        // nothing — not cleanup evidence
        code: `
        class Watcher {
          constructor(model: any, content: any) {
            model.changed.connect(this._onChanged, this);
            content.onClose(() => this.dispose());
          }
          dispose(): void {}
          private _onChanged(): void {}
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
        // Multiple uncleaned connections — reported once per class, on the
        // first offending connect
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
        errors: [{ messageId: 'missingSignalCleanup', line: 4 }]
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
        import { NotASignal } from './fixtures/not-a-signal';
        class Wiring {
          constructor(node: NotASignal) {
            node.connect(this._onEvent, this);
          }
          private _onEvent(): void {}
        }
      `
    }
  ],
  invalid: [
    {
      // Receiver typed as ISignal, no cleanup anywhere
      filename: 'tests/type-aware-fixture.ts',
      code: `
        import { ISignal } from '@lumino/signaling';
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
    }
  ]
});
