# `jupyter/plugin-activation-args`

Ensure JupyterLab plugin `activate` arguments match the order and count of `requires` and `optional` tokens.

## Why

Mismatched activation signatures can lead to runtime bugs and subtle plugin initialization failures.
This rule enforces a consistent, predictable contract.

## Rule details

This rule reports the following errors:

- `mismatchedOrder` — arguments are in the wrong order _(requires type-aware checking)_
- `incorrectType` — an argument's type annotation does not match its token _(requires type-aware checking)_
- `appNotFirst` — first argument name is not one of the allowed names (e.g. `app`)
- `invalidAppType` — first argument type is not compatible with `JupyterFrontEnd`
- `wrongArgumentCount` — argument count does not match `1 + requires.length + optional.length`
- `missingArgument` — a token from `requires`/`optional` has no corresponding argument
- `extraArgument` — an argument has no corresponding token in `requires`/`optional`
- `serviceManagerFirstArgNotNull` — `ServiceManagerPlugin` first argument is not `null`

## Incorrect

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'test-plugin',
  requires: [INotebookTracker, IRenderMimeRegistry],
  activate: (tracker: INotebookTracker, app: JupyterFrontEnd) => {
    console.log('Activated');
  }
};
```

## Correct

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'test-plugin',
  requires: [INotebookTracker, IRenderMimeRegistry],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    renderMime: IRenderMimeRegistry,
    translator: ITranslator | null
  ) => {
    console.log('Activated');
  }
};
```

## Type-aware checking

The two errors marked _(requires type-aware checking)_ above need TypeScript type information to work reliably. Without it, those checks are skipped and the errors will go unreported. You may also see `unresolvableTokenType` warnings frequently.

> **Strongly recommended:** configure `parserOptions.project` or `projectService` in your ESLint setup to enable full type-aware checking.

## Options

```ts
{
  "allowedFirstArgumentNames": ["app", "_app", "_"]
}
```

Use this option to permit your team’s preferred name for the first `activate` argument.
