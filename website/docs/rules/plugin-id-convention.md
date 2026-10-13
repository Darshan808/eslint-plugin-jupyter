# `plugin-id-convention`

Prefix each plugin ID with the extension package name followed by `:`.

These examples belong to a package named `@jupyterlab/example-extension`. The same convention applies to MIME renderer extensions.

## Examples

### Match the extension package

Using another package’s prefix makes deferring or locking this extension miss the plugin.

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/other-extension:plugin',
  activate: () => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/example-extension:plugin',
  activate: () => {}
};
```

### Include the package before a short plugin name

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'commands',
  activate: () => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/example-extension:commands',
  activate: () => {}
};
```

### Name a MIME renderer extension

MIME renderer entries are registered as plugins under their IDs too.

**Incorrect**

```ts
const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/other-extension:factory',
  rendererFactory
};
```

**Correct**

```ts
const extension: IRenderMime.IExtension = {
  id: '@jupyterlab/example-extension:factory',
  rendererFactory
};
```

## Why

JupyterLab treats the part of a plugin ID before the first `:` as the extension
name when it disables, defers or locks all plugins of an extension. A plugin
shipped under a different prefix is skipped by deferring and locking, and by
`jupyter labextension disable package-name` up to JupyterLab 4.6. From
JupyterLab 4.7, disabling by package name disables every plugin the package
provides, and the browser console warns about each plugin whose ID does not
follow the convention.

## Limitations

Renaming a plugin that has shipped has a cost. A `disabledExtensions`,
`deferredExtensions` or `lockedExtensions` entry that names the plugin in full
stops matching. If the plugin loads its settings under its own ID, as
JupyterLab's own plugins do, the user settings and any `overrides.json` entry
stay under the old ID as well. The extension can migrate the user settings
while a schema for the old ID is still served, which for a prefix that belonged
to another package is the case only while a package of that name is installed:

<details>
<summary>Example: migrating user settings after renaming a plugin</summary>

```ts
import { ISettingRegistry } from '@jupyterlab/settingregistry';

const OLD_ID = '@my-org/unconventional:plugin';

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@my-org/conventional:plugin',
  autoStart: true,
  requires: [ISettingRegistry],
  activate: async (_app: JupyterFrontEnd, registry: ISettingRegistry) => {
    const settings = await registry.load(plugin.id);
    // If nothing was saved under the new ID yet...
    if (Object.keys(settings.user).length === 0) {
      // ...copy the old settings once.
      // Note: by using `connector.fetch` rather than `registry.load` we
      // prevent the old ID from showing up in the settings editor.
      const old = await registry.connector.fetch(OLD_ID).catch(() => undefined);
      if (old && Object.keys(old.data.user).length > 0) {
        await settings.save(old.raw);
        await registry.connector.save(OLD_ID, '{}');
      }
    }
  }
};
```

</details>

Entries in `overrides.json` and in the page config are deployment configuration
and have to be updated there. When that cost is too high, keep the ID and add an
`eslint-disable-next-line jupyter/plugin-id-convention` comment with the reason.

## Options

```json
{
  "reportIdEqualToPackageName": false
}
```

### `reportIdEqualToPackageName`

Set to `true` to also report a plugin whose ID is exactly the package name, without `:` and a plugin name. These IDs are allowed by default because extension-level configuration can still match them.

### Require a suffix when the option is enabled

The following pair assumes `reportIdEqualToPackageName: true`. The first version is allowed with the default settings.

**Incorrect**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/example-extension',
  activate: () => {}
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/example-extension:plugin',
  activate: () => {}
};
```

<details>
<summary>Which plugin IDs are checked?</summary>

The rule uses the nearest JupyterLab extension manifest with `jupyterlab.extension` or `jupyterlab.mimeExtension` enabled. For the examples above, the manifest is:

```json
{
  "name": "@jupyterlab/example-extension",
  "jupyterlab": { "extension": true }
}
```

A MIME-only package can use `"mimeExtension": true` instead.

Plugins are found in typed variables and arrays or tuples, type assertions (`as`, `satisfies`) and factory function return types. Untyped objects are also checked when they look like a plugin (an `id`, an `activate` function and a plugin-only property such as `requires`) or a MIME renderer entry (an `id` and a `rendererFactory`).

The ID can be a string literal or assembled from constant strings:

- a template literal, a `+` concatenation, a `const` that copies another,
  or a member of a `const` object;
- with type information, anything whose type is a string literal type: a
  `const` imported from another module, a namespace member or an enum member.

An ID the rule cannot resolve to a string, such as one built
from a reassigned variable or a function call, is not checked.

</details>
