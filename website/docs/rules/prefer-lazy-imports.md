# `prefer-lazy-imports`

Prefer deferred imports for heavy dependencies of JupyterLab plugins.

## Why

Everything a plugin module imports at the top is downloaded, parsed and evaluated before JupyterLab can start, even when the code is only needed after a user action. Moving such an import into the function which uses it puts it in a separate bundle chunk. The browser then fetches it on demand.

Core JupyterLab uses this pattern, for example in `csvviewer` for `@lumino/datagrid`, in `codemirror-extension` for the settings form validator, and in `json-extension` for its own renderer module.

There is room for it in third-party extensions. Across the extensions this rule was measured on, it reports between 19% and 74% of an extension's own compiled code as deferrable. JupyterLab core reaches 0.8%, because core is the shared runtime and most of it is needed at startup. Every installed extension is fetched before the application starts, so those shares accumulate across an installation.

## Incorrect

```ts
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { HeavyWidget } from './widget';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    app.shell.add(new HeavyWidget(), 'main');
  }
};
```

```ts
// Pulls in the whole Notebook application package for one instance check
import { NotebookShell } from '@jupyter-notebook/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  activate: app => {
    if (app.shell instanceof NotebookShell) {
      // ...
    }
  }
};
```

## Correct

```ts
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  autoStart: true,
  activate: async (app: JupyterFrontEnd) => {
    const { HeavyWidget } = await import('./widget');
    app.shell.add(new HeavyWidget(), 'main');
  }
};
```

When `activate` cannot become `async`, defer inside the command or factory which needs the module:

```ts
activate: (app: JupyterFrontEnd) => {
  app.commands.addCommand(CommandIDs.open, {
    execute: async () => {
      const { HeavyWidget } = await import('./widget');
      app.shell.add(new HeavyWidget(), 'main');
    }
  });
};
```

Types can still be imported at the top, because TypeScript erases them:

```ts
import type { HeavyWidget } from './widget';
```

## Rule details

The rule only looks at plugin modules, meaning files which define a JupyterLab plugin. [Which files count](#which-files-count) lists the forms it recognises. [`reportInteractionCallbacks`](#reportinteractioncallbacks) extends it to the remaining modules, with a stricter trigger.

In such a file, an import is reported when every runtime use of its bindings sits inside a function body, a method, or an instance field initializer. Turning it into `await import()` is then a mechanical change. An import which is needed while the module is evaluated is left alone, because the imported module is fetched at startup regardless of how the other bindings are written.

These never produce a report:

- Packages the application already loads eagerly: the [`allowedPackages`](#allowedpackages) list, and whatever the manifest declares under [Shared packages](#shared-packages).
- `import type`, type-only specifiers, and bindings used only in type positions. TypeScript erases all of them.
- Side-effect imports such as `import '../style/index.css'`, which have no binding to move.
- Assets which never become bundled bytes, described under [Assets](#assets).
- Tokens referenced in `requires`, `optional` or `provides`. JupyterLab reads those when the plugin is registered, so they can never be deferred.
- Sources which the same file re-exports with `export { X } from '...'` or `export * from '...'`, since the re-export keeps them in the startup bundle.
- Bindings whose only use is inside a helper which is itself called while the module is evaluated.
- Modules holding less code than [`minimumSize`](#minimumsize), because a separate chunk costs more than it saves.

The rule has no autofix. The enclosing function usually has to become `async`, and that changes its signature, so the edit is left to the author.

### Which files count

A file is a plugin module when it contains any of these:

- A value annotated with `JupyterFrontEndPlugin` or `ServiceManagerPlugin`, including through an array, a union or a `Promise`.
- A value cast to one of those types with `as`.
- A function whose declared return type is one of those types, so plugin factories count.
- An object literal shaped like a plugin: a string `id`, an `activate` function, and at least one of `autoStart`, `requires`, `optional`, `provides` or `description`. This covers plugins written without a type annotation.

Type names renamed through an import alias are resolved when type information is available.

### Assumptions about the build

The rule targets the build that JupyterLab extensions normally use: rspack driven by `@jupyter/builder`, with Module Federation sharing packages between the application and the extensions it loads. Webpack behaves the same way, because the builder configuration uses the API both share.

Deferring pays off at all because that build turns `await import()` into a chunk the browser fetches on first use. [`allowedPackages`](#allowedpackages) can treat a package as free because Module Federation provides shared packages at runtime instead of bundling them. [`minimumSize`](#minimumsize) has a floor above zero because each chunk carries some bundler runtime of its own.

Under a different bundler the asset handling below does not apply. Under a different application the shared packages differ. Notebook and JupyterLite declare their own lists, and a monorepo which shares its own packages should add them to `allowedPackages`.

### Assets

Whether deferring an asset helps depends on what the bundler does with it.

| Import                                                                                               | Bundler handling                                                 | Reported                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| `.svg` imported from JavaScript, `.raw.css`, `.md`, `.txt`                                           | `asset/source`: the whole file arrives as a string in the bundle | yes, when over `minimumSize` |
| `.json`                                                                                              | parsed into an object and inlined                                | yes, when over `minimumSize` |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.avif`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.otf` | `asset/resource`: emitted as a separate file                     | no                           |
| `.wasm`, `.html`                                                                                     | emitted as a separate file too                                   | no                           |
| `.css`, `.scss`, `.sass`, `.less`                                                                    | `style-loader`: applies the styles when the import runs          | no                           |

The first two rows add their full size to the startup chunk, so they are measured against `minimumSize` like any module. A large illustration imported at the top of a plugin module is exactly the case this rule is for.

An asset emitted as a separate file is fetched only when it is used, so moving the import saves nothing. A stylesheet is a different case again. `import '../style/index.css'` has no binding to move, and a `.css` import which does have one goes through `style-loader`, so deferring it would change when the styles take effect rather than only what is downloaded.

### Shared packages

Besides `allowedPackages`, the rule reads `jupyterlab.sharedPackages` from the extension's own manifest. It walks up from the linted file to the nearest `package.json` carrying a `jupyterlab` key, and treats every package declared there with `bundled: false` as free to import at the top.

That follows what `@jupyter/builder` does. `bundled: false` becomes `import: false`, which leaves the package to the application at runtime. Every other form stays in this extension's bundle and is still reported: `bundled: true`, an entry with no `bundled` key, and an entry set to `false`, which drops the package from the shared scope altogether.

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

An import of `@myorg/host-provided` is exempt. One of `@myorg/bundled-here` is reported, because this extension ships it.

Reading the manifest per package is something a fixed list cannot do. A monorepo can bundle one of its own packages inside a first extension and let a second extension take that copy from the application. The same import is then reported in the first extension and exempt in the second.

The manifest only ever adds to `allowedPackages`. Setting that option does not switch this off.

## Options

| Option                                              | Type       | Default        |
| --------------------------------------------------- | ---------- | -------------- |
| [`allowedPackages`](#allowedpackages)               | `string[]` | the list below |
| [`ignoreImports`](#ignoreimports)                   | `string[]` | `[]`           |
| [`minimumSize`](#minimumsize)                       | `number`   | `4096`         |
| [`reportModuleLevelUsage`](#reportmodulelevelusage) | `boolean`  | `false`        |

### `allowedPackages`

Type: `string[]`, default: the list below.

Packages which the application loads eagerly anyway, so importing them at the top of a plugin module costs nothing. `*` matches any run of characters, and a `!` prefix denies a package whatever else in the list matches it. Subpath imports are matched against their owning package, so `@jupyterlab/*` covers `@jupyterlab/services/lib/kernel`.

The default is the singleton list from JupyterLab's `staging/package.json`, minus `@lumino/datagrid`. That package is denied because core defers it too, in `packages/csvviewer`.

<details>
<summary>The default list</summary>

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

A monorepo which shares its own packages between extensions usually does not need to list them here, because the rule reads them from the manifest. See [Shared packages](#shared-packages).

Setting this option replaces the default list rather than adding to it, so an extension which sets it has to repeat every default it still wants:

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

That example keeps five of the defaults and adds `@myorg/*`. The eleven defaults it leaves out, among them `@jupyter/ydoc`, `yjs` and the three `@codemirror` packages, are reported again.

### `ignoreImports`

Type: `string[]`, default: `[]`.

Import specifiers to skip, matched the same way as `allowedPackages`: `*` matches any run of characters, a `!` prefix denies a specifier whatever else in the list matches it, and a bare specifier is tested both as written and against its owning package.

```json
{
  "ignoreImports": ["./generated/*", "@myorg/internal"]
}
```

### `minimumSize`

Type: `number`, default: `4096`.

The smallest module worth deferring, in bytes. Set it to `0` to report every module whatever its size.

The rule resolves a relative import on disk, compiles it with TypeScript, and measures the emitted code plus the code of everything it statically imports by relative path. Comments and type declarations are gone from that output, so they never count. This is what keeps a file of interfaces from being reported. Such a file can be several kilobytes of source and a few hundred bytes once compiled, and the rule sees the smaller figure.

Measuring the closure rather than the single file matters just as much in the other direction. A few hundred bytes of glue which imports a whole subsystem counts as the size of that subsystem.

Bare package specifiers are not measured. A package which is not exempt is not in the shared runtime, so it is bundled into the extension and always counts as worth deferring. A module which cannot be read is reported too, so a missing file never hides a finding.

An async chunk carries a few hundred bytes of bundler runtime and costs one request, so at about a kilobyte the saving cancels out. Above that the gain per import falls away quickly, because a handful of large modules hold nearly all the weight.

The table below comes from a run over JupyterLab core and about two dozen extensions, roughly 1900 files. "Imports reported" is the share of the imports which `minimumSize: 0` reports. "Code covered" is the share of the deferrable compiled bytes those reports account for.

| `minimumSize` | Imports reported | Code covered |
| ------------- | ---------------- | ------------ |
| `0`           | 100%             | 100%         |
| `1024`        | 82%              | 99%          |
| `2048`        | 62%              | 98%          |
| `4096`        | 46%              | 95%          |
| `8192`        | 36%              | 92%          |
| `16384`       | 17%              | 80%          |

The default is `4096` because it still covers 95% of the code which could be deferred while reporting 46% of the imports, against 82% at `1024`. Lowering it to `1024` increases the coverage at the cost of roughly twice as many reports. Raising it to `8192` or higher restricts the reports to the largest modules only.

The shipped bytes behind one report are modest. At the `4096` boundary a report is worth roughly 2.5 KB minified and under a kilobyte gzipped. A few large modules carry most of the total, so the first few reports in a package are usually worth more than all the rest together.

Reports for packages are never filtered by size, because they are worth far more. A third-party library and its dependencies run from tens to hundreds of kilobytes, so deferring one can save more than every relative import in the same extension put together.

```json
{
  "minimumSize": 1024
}
```

### `reportInteractionCallbacks`

Off by default. When enabled, the rule also checks modules which do not define a plugin, and reports an import there when every use sits inside a user-interaction handler: a command `execute` implementation, a listener for an interaction event such as `click`, or a JSX handler prop such as `onClick`.

Outside a plugin module, an import being used only inside functions proves nothing, because an ordinary function may run while the application starts. A widget's `render` is called as soon as the widget is shown, and making it `async` would break its signature. An interaction handler holds on both counts. It cannot run before the user acts, and it is safe to make `async`, because a command may return a promise and the return value of an event listener is ignored.

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

The deferred form is the same as in a plugin module:

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

Only positions which name the user directly count: `execute`, a listener registered for an interaction event, a JSX `on*` interaction prop, or a DOM `on*` assignment. A command `label` renders whenever the command is shown, which can be at startup, so it does not count, and neither does an event such as `load`.

Measured over the same corpus as `minimumSize`, this adds 19 reports on top of the 50 the rule finds by default. The single-file limitation weighs more here than in plugin modules: a module used only on click is often reachable through the same file's other imports, and then the chunk shrinks only once those defer it too. [Limitations](#limitations) describes this.

```ts
{
  "reportInteractionCallbacks": true
}
```

### `reportModuleLevelUsage`

Type: `boolean`, default: `false`.

When enabled, imports used while the module is evaluated are reported as well, so that the file can be restructured to need less at load time. Tokens in `requires`, `optional` and `provides` stay exempt. This also reports aggregator modules which import plugin objects into an exported array, so expect considerably more findings.

```json
{
  "reportModuleLevelUsage": true
}
```

## Known limitations

The rule sees one file at a time. If another module in the same bundle imports the same source eagerly, the startup chunk stays the same size whatever this file does, and the rule cannot tell.

This is the main source of unhelpful reports, and it grows with how much a package shares internally. A helper used by every feature plugin gets reported in each of them, and deferring any one of them changes nothing while the others still load at startup.

Counting the other importers does not answer that. Some of them are tests, which are never bundled at all. Others sit in the same subtree, and move into the lazy chunk along with the module.

So defer at the edge of a subsystem rather than one module at a time. When the same source is reported from several plugin files which all load at startup, defer it in all of them or in none.

Sizes are an estimate. The rule counts compiled bytes, which is not the same as bundled and minified bytes. It also stops at package boundaries, so a small module which pulls in a large dependency is measured as small.

A value re-export is never reported. When a file re-exports a source with `export { X } from '...'`, the source stays in the startup bundle whatever the matching import does, so the rule skips it. Splitting an entry point which re-exports its own implementation is a larger refactor than this rule tries to describe.
