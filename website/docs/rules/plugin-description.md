# `plugin-description`

Ensure all `JupyterFrontEndPlugin` and `ServiceManagerPlugin` objects define a non-empty `description` property.

## Examples

### Describe what the plugin provides

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:commands',
  autoStart: true,
  activate: activateCommands
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:commands',
  description: 'Adds commands for exporting notebooks.',
  autoStart: true,
  activate: activateCommands
};
```

### Replace an empty description

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:preview',
  description: '',
  activate: activatePreview
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:preview',
  description: 'Provides a preview of the current document.',
  activate: activatePreview
};
```

### Replace a whitespace-only description

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:status',
  description: '   ',
  activate: activateStatus
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:status',
  description: 'Shows the current kernel status.',
  activate: activateStatus
};
```

### Plugin arrays and collections

Plugins declared inside typed arrays or tuples, arrays cast to a plugin type (`export default [...] as JupyterFrontEndPlugin<any>[]`), or factory functions with a plugin return type must also include descriptions. An untyped `export default [{ ... }]` is not checked:

**Incorrect**

```ts
const plugins: JupyterFrontEndPlugin<any>[] = [
  {
    id: 'my-extension:status',
    activate: activateStatus
  }
];
```

**Correct**

```ts
const plugins: JupyterFrontEndPlugin<any>[] = [
  {
    id: 'my-extension:status',
    description: 'Shows the current kernel status.',
    activate: activateStatus
  }
];
```

## Why

A description tells maintainers and integrators what a plugin does without requiring them to read its activation code. Use a short, meaningful description; an empty or whitespace-only string is also reported.

The rule checks plugins defined as single variables, elements within typed plugin arrays or tuples, type assertions (`as`, `satisfies`), and factory function return values.

## Options

This rule has no options.
