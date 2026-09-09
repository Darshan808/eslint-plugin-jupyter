# `galata-prefer-context-menu-helper`

Prefer Galata's `page.filebrowser.open` / `page.notebook.open` helpers over a raw right-click, `Open With`, factory sequence.

## Why

Opening a document with a specific factory is a four-step gesture when it is written by hand: right-click the file in the browser, hover `Open With` to open its submenu, click the factory, then wait for the widget to appear.

```ts
await page.click(`.jp-DirListing-item span:has-text("${NOTEBOOK_NAME}")`, {
  button: 'right'
});
await page.hover('text=Open With');
await page.click('text=Notebook (no kernel)');
await page.waitForSelector('.jp-NotebookPanel');
```

Every step is fragile. The listing item has to be found by name inside markup that changes; the submenu opens on a hover, so the click after it races the animation; the `waitForSelector` at the end is hand-written and only approximates "the document is ready".

`FileBrowserHelper.open(path, factory)` and `NotebookHelper.open(name, { noKernel: true })` do the same thing in one call, and they wait for the document to be revealed rather than for a selector to exist:

```ts
await page.notebook.open(NOTEBOOK_NAME, { noKernel: true });
await page.filebrowser.open('README.md', 'Markdown Preview');
```

## Rule details

The rule reports the factory click at the end of a complete `Open With` flow inside one test:

1. something opened the file browser context menu — a click with `{ button: 'right' }` (on `page` or on a locator), or `page.menu.openContextMenu` / `openContextMenuLocator`;
2. `Open With` was hovered or clicked, opening the factory submenu;
3. a menu item was clicked while that submenu was open.

The message names the helper to use. A click on `Notebook (no kernel)` is reported as `preferNotebookOpenNoKernel`; any other factory is `preferFilebrowserOpenFactory`, which quotes the label as the second argument to `page.filebrowser.open`. When the label is interpolated and cannot be read, the generic `preferFilebrowserOpen` is reported instead.

`waitForSelector` calls are ignored, so the waits a test interleaves through the flow do not break the sequence.

## Incorrect

```ts
await page.click('.jp-DirListing-item >> text=notebook.ipynb', {
  button: 'right'
});
await page.hover('text=Open With');
await page.click('text=Notebook (no kernel)');
await page.waitForSelector('.jp-NotebookPanel');

await page.click('.jp-DirListing-item >> text=README.md', { button: 'right' });
await page.click('text=Open With');
await page.click('.lm-Menu-itemLabel:text("Markdown Preview")');

await page.menu.openContextMenu('.jp-DirListing-item >> text=data.csv');
await page.getByText('Open With').hover();
await page.getByRole('menuitem', { name: 'CSV Viewer' }).click();
```

## Correct

```ts
await page.notebook.open('notebook.ipynb', { noKernel: true });
await page.filebrowser.open('README.md', 'Markdown Preview');
await page.filebrowser.open('data.csv', 'CSV Viewer');
```

## Options

This rule has no options.
