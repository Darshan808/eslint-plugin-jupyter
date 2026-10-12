# `prefer-lazy-imports`

Load heavy dependencies when a plugin needs them, so they do not delay startup.

## Examples

### Load a widget when its command runs

The static import loads the widget even if the user never opens it. Keep activation synchronous and fetch the widget when the command runs.

**Incorrect**

```ts
import { HeavyWidget } from './widget';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.commands.addCommand('my-extension:open', {
      execute: () => {
        app.shell.add(new HeavyWidget(), 'main');
      }
    });
  }
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.commands.addCommand('my-extension:open', {
      execute: async () => {
        const { HeavyWidget } = await import('./widget');
        app.shell.add(new HeavyWidget(), 'main');
      }
    });
  }
};
```

### Import only the type you need

Use a whole `import type` declaration. With `verbatimModuleSyntax`, a value import stays in the output, and even `import { type DataModel }` can leave an empty import that loads the package.

**Incorrect**

```ts
import { DataModel } from '@lumino/datagrid';

export interface IOptions {
  model: DataModel;
}
```

**Correct**

```ts
import type { DataModel } from '@lumino/datagrid';

export interface IOptions {
  model: DataModel;
}
```

### Defer a factory dependency outside a plugin module

Known deferred packages are checked in every file. The corrected factory returns a promise, so callers must now await `createGrid()`.

**Incorrect**

```ts
import { DataGrid } from '@lumino/datagrid';

export function createGrid(): DataGrid {
  return new DataGrid();
}
```

**Correct**

```ts
import type { DataGrid } from '@lumino/datagrid';

export async function createGrid(): Promise<DataGrid> {
  const { DataGrid } = await import('@lumino/datagrid');
  return new DataGrid();
}
```

### Load an application-specific class during on-demand activation

This plugin is activated on demand and does not declare `autoStart: true`. A static import of the Notebook application package, used only for an instance check, loads that package at startup. Review dependencies from autostart plugins too; see [Autostart plugins](#autostart-plugins).

**Incorrect**

```ts
import { NotebookShell } from '@jupyter-notebook/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:notebook',
  activate: app => {
    if (app.shell instanceof NotebookShell) {
      configureNotebook(app);
    }
  }
};
```

**Correct**

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:notebook',
  activate: async app => {
    const { NotebookShell } = await import('@jupyter-notebook/application');
    if (app.shell instanceof NotebookShell) {
      configureNotebook(app);
    }
  }
};
```

### Export a report on demand

This non-plugin module is checked when `reportInteractionCallbacks: true`. The export library is only needed after the user runs the command.

**Incorrect**

```ts
import { saveAs } from 'file-saver';

export function addCommands(commands: CommandRegistry): void {
  commands.addCommand(CommandIDs.export, {
    execute: async () => {
      saveAs(await renderReport());
    }
  });
}
```

**Correct**

```ts
export function addCommands(commands: CommandRegistry): void {
  commands.addCommand(CommandIDs.export, {
    execute: async () => {
      const { saveAs } = await import('file-saver');
      saveAs(await renderReport());
    }
  });
}
```

## Why

Top-level imports are downloaded and evaluated before JupyterLab can start. A large widget, renderer or export library adds to that work even when its feature is never used. In a standard JupyterLab extension build, `import()` lets the browser fetch that code on demand.

JupyterLab uses this pattern itself: its CSV viewer defers `@lumino/datagrid`, and its JSON extension defers its renderer module.

The rule mainly checks files that define plugins. It also checks imports of known deferred packages, such as `@lumino/datagrid` and `mermaid`, in any file. It has no automatic fix: making a function asynchronous changes what its callers must handle.

## Autostart plugins

Keep `activate()` synchronous when possible, and place the import in the callback that needs it, as in the correct example. Awaiting an import directly in an autostart plugin still blocks startup and adds another request:

**Avoid** — the dynamic import silences the rule, but still delays startup:

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    const { HeavyWidget } = await import('./widget');
    app.commands.addCommand('my-extension:open', {
      execute: () => app.shell.add(new HeavyWidget(), 'main')
    });
  }
};
```

**Prefer** — keep the import in the command callback:

```ts
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.commands.addCommand('my-extension:open', {
      execute: async () => {
        const { HeavyWidget } = await import('./widget');
        app.shell.add(new HeavyWidget(), 'main');
      }
    });
  }
};
```

If activation needs the dependency immediately, keep the static import and explain the exception with an `eslint-disable-next-line jupyter/prefer-lazy-imports` comment, or use [`ignoreImports`](#ignoreimports).

A plugin without `autoStart: true` can import during activation, but it will still delay anything waiting for that plugin. Prefer loading on user interaction where possible.

## Options

| Option                                                      | Type       | Default   |
| ----------------------------------------------------------- | ---------- | --------- |
| [`allowedPackages`](#allowedpackages)                       | `string[]` | See below |
| [`deferredPackages`](#deferredpackages)                     | `string[]` | See below |
| [`ignoreImports`](#ignoreimports)                           | `string[]` | `[]`      |
| [`minimumSize`](#minimumsize)                               | `number`   | `4096`    |
| [`reportInteractionCallbacks`](#reportinteractioncallbacks) | `boolean`  | `false`   |
| [`reportModuleLevelUsage`](#reportmodulelevelusage)         | `boolean`  | `false`   |
| [`reportReExports`](#reportreexports)                       | `boolean`  | `false`   |

### `allowedPackages`

Packages the application already loads at startup. Their imports are exempt unless also listed in `deferredPackages`.

Patterns support `*` for any sequence of characters and `!` to exclude a package regardless of other matches. Subpaths match their owning package, so `@jupyterlab/*` covers `@jupyterlab/services/lib/kernel`.

Providing a list **replaces** the defaults. Include any defaults you want to keep. For example:

```json
{
  "allowedPackages": [
    "@jupyterlab/*",
    "@lumino/*",
    "!@lumino/datagrid",
    "react",
    "react-dom",
    "@myorg/*"
  ]
}
```

This exempts your organization's packages and keeps only the listed defaults. Omitted defaults, such as `yjs`, are checked again.

<details>
<summary>Default allowed packages</summary>

```json
{
  "allowedPackages": [
    "@jupyterlab/*",
    "@lumino/*",
    "!@lumino/datagrid",
    "@jupyter/ydoc",
    "@jupyter/react-components",
    "@jupyter/web-components",
    "@codemirror/language",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@microsoft/fast-element",
    "@microsoft/fast-foundation",
    "react",
    "react-dom",
    "yjs"
  ]
}
```

</details>

Packages declared with `bundled: false` in the extension's `jupyterlab.sharedPackages` manifest are also exempt, unless listed in `deferredPackages`. Changing `allowedPackages` does not remove these manifest exemptions.

### `deferredPackages`

Packages that should load on demand. Static imports and re-exports are reported in every file, including side-effect imports and imports with no runtime use. Whole `import type` and `export type` declarations are exempt, as are the asset types described below in the "Build assumptions, assets and shared packages" details section.

Patterns work like `allowedPackages`. This list takes precedence over both `allowedPackages` and manifest exemptions; `ignoreImports` can still exempt an import.

Providing a list **replaces** the defaults:

```json
{
  "deferredPackages": [
    "@lumino/datagrid",
    "@codemirror/lang-*",
    "@codemirror/legacy-modes",
    "@codemirror/search",
    "@rjsf/validator-ajv8",
    "mermaid",
    "react-toastify"
  ]
}
```

To exempt one entry while keeping the defaults, use `ignoreImports`:

```json
{
  "ignoreImports": ["@lumino/datagrid"]
}
```

### `ignoreImports`

Import specifiers to skip. Supports `*` wildcards and `!` exclusions as above, and matches both the full specifier and its owning package. The default is `[]`.

```json
{
  "ignoreImports": ["./generated/*", "@myorg/internal"]
}
```

### `minimumSize`

Minimum estimated code size for a relative import, in bytes. The default is `4096`. Lower it for more reports, raise it to focus on larger modules, or set it to `0` to report regardless of size.

Package imports and modules whose size cannot be determined are not filtered by this threshold.

<details>
<summary>How size is estimated</summary>

The estimate includes compiled code from the module and its static relative imports, excluding comments and types. It stops at package boundaries and does not measure the final minified or compressed bundle.

A small wrapper around a large local module can therefore exceed the threshold. Conversely, a small local module that imports a large external package can be underestimated. The default avoids creating a separate request for every small module.

The original evaluation over JupyterLab and about two dozen extensions illustrates the tradeoff. Percentages are relative to the reports and estimated deferrable code found with `minimumSize: 0`, not measurements of startup time:

| `minimumSize` | Imports reported | Code covered |
| ------------- | ---------------- | ------------ |
| `0`           | 100%             | 100%         |
| `1024`        | 82%              | 99%          |
| `2048`        | 62%              | 98%          |
| `4096`        | 46%              | 95%          |
| `8192`        | 36%              | 92%          |
| `16384`       | 17%              | 80%          |

The default `4096` retained most of the estimated savings while reducing the number of reports. Your extension's results can differ; inspect its actual bundle when tuning this option.

</details>

### `reportInteractionCallbacks`

Default: `false`. Enable it to also check non-plugin files when an import is used only in user-interaction handlers: command execution, interaction event listeners, JSX handlers such as `onClick`, or DOM assignments such as `onclick`. See [Export a report on demand](#export-a-report-on-demand).

```json
{
  "reportInteractionCallbacks": true
}
```

Rendering callbacks, command labels and events such as `load` do not count as user interaction because they may run at startup.

### `reportModuleLevelUsage`

Default: `false`. Enable it to report imports used while a plugin module is evaluated. These require restructuring before they can be deferred. Tokens in `requires`, `optional` and `provides` remain exempt.

This also checks modules that collect imported plugins into an exported array, so expect more reports.

### `reportReExports`

Default: `false`. Enable it to report value re-exports of modules whose imports are only used inside functions, which would otherwise keep the module in the startup bundle.

```json
{
  "reportReExports": true
}
```

When an imported module is only used inside functions or interaction handlers, but a value from it is re-exported via `export { ... } from '...'` or `export * from '...'`, the re-export keeps the module in the startup bundle. Enabling this option reports the re-export statement. If only TypeScript types are needed, use `export type { ... }` instead, which allows the static import to be deferred.

## Known limitations

The rule checks one file at a time. If other startup modules import the same dependency, changing only one import may not reduce the startup bundle. Defer the feature as a whole and check the resulting build.

If a dependency is needed to define a class, defer the module containing that class. A module already loaded only through `import()` can keep its static imports:

```ts
// model.ts is loaded only with await import('./model').
// eslint-disable-next-line jupyter/prefer-lazy-imports
import { DataModel } from '@lumino/datagrid';

export class CSVModel extends DataModel {
  // ...
}
```

A plugin without `autoStart: true` may still be required by an autostart plugin. The rule cannot detect that dependency across files, so review whether the proposed change would delay startup.

<details>
<summary>Which files and imports are checked?</summary>

Plugin files include declarations using `JupyterFrontEndPlugin` or `ServiceManagerPlugin`, including arrays, unions, promises, casts and factory return types. Untyped objects count when they contain a string `id`, an `activate` function and at least one of `autoStart`, `requires`, `optional`, `provides` or `description`. Aliased type names need type information.

For packages outside `deferredPackages`, by default the rule checks imports used only inside functions, methods or instance field initializers. It skips type-only uses, side-effect imports, plugin tokens and sources re-exported from the same file. Imports needed during module evaluation, including through a helper called at module scope, are left alone unless `reportModuleLevelUsage` is enabled. An eager re-export keeps the source in the startup bundle even if its other uses are deferred, unless `reportReExports` is enabled.

</details>

<details>
<summary>Build assumptions, assets and shared packages</summary>

The rule assumes the standard JupyterLab extension build with rspack or webpack and Module Federation. Adjust the package lists for other applications or build setups. Notebook, JupyterLite and applications that share their own packages can have different eagerly loaded dependencies.

In that build, SVG, raw CSS, Markdown, text and JSON imports add their contents to the bundle, so large imports can benefit from deferral. Images such as PNG and JPEG, fonts, WebAssembly and HTML are emitted separately and are not reported. Ordinary stylesheet imports are also exempt because deferring them changes when styles take effect.

The nearest extension manifest supplies `jupyterlab.sharedPackages`. Only entries with `bundled: false` add exemptions; `bundled: true`, entries without `bundled`, and entries set to `false` do not.

```json
{
  "jupyterlab": {
    "sharedPackages": {
      "@myorg/host-provided": { "singleton": true, "bundled": false },
      "@myorg/bundled-here": { "singleton": true, "bundled": true }
    }
  }
}
```

Here `@myorg/host-provided` is exempt unless listed in `deferredPackages`, while `@myorg/bundled-here` can be reported.

</details>
