# `plugin-activation-args`

Ensure JupyterLab plugin `activate` arguments match the order and count of `requires` and `optional` tokens.

## Examples

### Put the application first

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:tracker',
  requires: [INotebookTracker],
  activate: (tracker: INotebookTracker, app: JupyterFrontEnd) => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:tracker',
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {}
};
```

### Match the order of required services

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:renderer',
  requires: [INotebookTracker, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    renderMime: IRenderMimeRegistry,
    tracker: INotebookTracker
  ) => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:renderer',
  requires: [INotebookTracker, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    renderMime: IRenderMimeRegistry
  ) => {}
};
```

### Include an argument for each service

Remove an unused dependency from `requires` if the plugin does not need it, or include its corresponding argument.

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:tracker',
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd) => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:tracker',
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker) => {}
};
```

### Allow an optional service to be absent

Optional services follow all required services. Handle the missing-service case before using one.

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:translation',
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator) => {
    const trans = translator.load('my-extension');
  }
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:translation',
  optional: [ITranslator],
  activate: (app: JupyterFrontEnd, translator: ITranslator | null) => {
    const trans = (translator ?? nullTranslator).load('my-extension');
  }
};
```

### Use null for a service-manager plugin

Service-manager plugins receive `null` in the first position, not the application.

**Incorrect**

```ts
const plugin: ServiceManagerPlugin<void> = {
  id: 'my-extension:service',
  activate: (app: JupyterFrontEnd) => {}
};
```

**Correct**

```ts
const plugin: ServiceManagerPlugin<void> = {
  id: 'my-extension:service',
  activate: (_: null) => {}
};
```

### Use a referenced activation function

The rule also checks activation functions declared separately and referenced by identifier or shorthand:

**Correct**

```ts
function activate(app: JupyterFrontEnd, tracker: INotebookTracker): void {
  // ...
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:tracker',
  requires: [INotebookTracker],
  activate
};
```

## Why

JupyterLab passes the application first, followed by required services and then optional services, in the order their tokens are listed. A different signature can pass the wrong service to your code or leave an argument missing. Optional services may be absent, so their argument types must allow `null` or `undefined`.

For a `ServiceManagerPlugin`, the first argument is `null` instead of the application.

## Type-aware checking

Enable `parserOptions.project` or `projectService` in your ESLint configuration to check service argument types and order. Without type information, those checks are skipped and you may see warnings about token types that cannot be resolved.

## Options

The defaults are:

```json
{
  "allowedFirstArgumentNames": ["app", "_app", "_"]
}
```

Use this option to permit your team’s preferred name for the first `activate` argument. The rule also checks its type, the service argument types, missing arguments and extra arguments.
