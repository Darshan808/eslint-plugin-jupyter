# `jupyter/plugin-activation-args`

Ensure JupyterLab plugin `activate` arguments match the order and count of `requires` and `optional` tokens.

## Why

Mismatched activation signatures can lead to runtime bugs and subtle plugin initialization failures.
This rule enforces a consistent, predictable contract.

## Rule details

For `JupyterFrontEndPlugin` objects, this rule validates:

- First `activate` argument name is allowed (`app` by default)
- First argument type is compatible (`JupyterFrontEnd`, `JupyterLab`, or `Application`)
- Argument count equals: `1 + requires.length + optional.length`
- Token order in `activate` matches `requires` then `optional`

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

## Options

```ts
{
  "allowedFirstArgumentNames": ["app", "_app", "_"]
}
```

Use this option to permit your team’s preferred name for the first `activate` argument.
