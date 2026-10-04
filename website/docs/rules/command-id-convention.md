# `command-id-convention`

Ensure command IDs follow the `namespace:name` convention.

## Examples

### Add a namespace to the command ID

**Incorrect**

```ts
namespace CommandIDs {
  export const open = 'open-file';
}

app.commands.addCommand(CommandIDs.open, {
  label: 'Open File',
  execute: () => {}
});
```

**Correct**

```ts
namespace CommandIDs {
  export const open = 'my-extension:open-file';
}

app.commands.addCommand(CommandIDs.open, {
  label: 'Open File',
  execute: () => {}
});
```

### Keep both parts non-empty

**Incorrect**

```ts
app.commands.addCommand(':open-file', {
  execute: () => {}
});
```

**Correct**

```ts
app.commands.addCommand('my-extension:open-file', {
  execute: () => {}
});
```

## Why

All extensions register their commands in one shared registry. The part of the
ID before the first `:` tells which extension a command belongs to.

JupyterLab relies on it: the Keyboard Shortcuts editor shows it as the
command's category, and the command docs are grouped by it. Agents and tools
that search the command list can find an extension's commands by its
namespace, since the label rarely mentions the extension. A namespace also
keeps a short name like `open` from colliding with another extension's command.

<details>
<summary>Which namespace should I use?</summary>

Any namespace is accepted. JupyterLab
[recommends](https://jupyterlab.readthedocs.io/en/latest/developer/patterns.html#command-names)
`package-name:verb-noun`, but it does not keep a fixed list, and its own
commands do not always use package names.

</details>

<details>
<summary>Which command IDs are checked?</summary>

The rule checks the first argument of `.addCommand(id, options)`. The ID can be
a string literal or assembled from constant strings:

- a template literal, a `+` concatenation or a `const`;
- a member of a `const` object, or of a namespace or enum declared in the same
  file, such as the usual `CommandIDs` namespace;
- with type information, anything whose type is a string literal type, such as
  a `const` imported from another module.

An ID the rule cannot resolve to a string, such as one returned by a function
call, is not checked. The recommended configuration turns the rule off for
`**/*.spec.{ts,js}` and `**/*.test.{ts,js}` files.

</details>

## Limitations

Renaming a command that has shipped breaks the keyboard shortcuts, menus and
toolbar items that refer to the old ID in user settings. When that cost is too
high, keep the ID and add an
`eslint-disable-next-line jupyter/command-id-convention` comment with the
reason.

## Options

This rule has no options.
