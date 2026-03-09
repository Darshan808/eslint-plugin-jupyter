# `jupyter/command-described-by`

Ensure JupyterLab command registrations include a `describedBy` property.

## Why

JupyterLab commands with arguments should include explicit command argument metadata.
This improves discoverability and helps maintain command contracts.

## Rule details

The rule checks calls that match `*.addCommand(...)` patterns and reports when:

- The command options object has an `execute` function
- But does not provide `describedBy`

## Incorrect

```ts
app.commands.addCommand(CommandIDs.test, {
  label: 'Test Command',
  execute: (args) => {
    console.log(args.value);
  }
});
```

## Correct

```ts
app.commands.addCommand(CommandIDs.test, {
  label: 'Test Command',
  execute: (args) => {
    console.log(args.value);
  },
  describedBy: {
    args: {
      type: 'object',
      properties: {
        value: { type: 'string' }
      }
    }
  }
});
```

## Options

This rule has no options.
