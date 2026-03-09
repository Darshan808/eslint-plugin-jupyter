# `jupyter/plugin-description`

Ensure all `JupyterFrontEndPlugin` objects define a non-empty `description` property.

## Why

A plugin description improves readability for maintainers and integrators, especially in larger extension ecosystems.

## Rule details

The rule inspects `JupyterFrontEndPlugin` object declarations and reports when:

- `description` is missing
- `description` is an empty string

## Incorrect

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'test-plugin:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Activated');
  }
};
```

## Correct

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'test-plugin:plugin',
  description: 'Test plugin used for lint rule examples',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('Activated');
  }
};
```

## Options

This rule has no options.
