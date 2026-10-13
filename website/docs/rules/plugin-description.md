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

## Why

A description tells maintainers and integrators what a plugin does without requiring them to read its activation code. Use a short, meaningful description; an empty or whitespace-only string is also reported.

Plugins are found in typed variables and arrays or tuples, type assertions (`as`, `satisfies`) and factory function return types; an untyped `export default [{ ... }]` is not checked.

## Options

This rule has no options.
