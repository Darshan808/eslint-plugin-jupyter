/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferNotebookOpenByPath'
  | 'preferOpenHomeDirectory'
  | 'preferOpenDirectory'
  | 'preferFilebrowserHelper';
type Options = [];

const NOTEBOOK_FILE_PATTERN = /\.ipynb\b/;
const BREADCRUMBS_PATTERN = /jp-BreadCrumbs-home/;
// Selectors scoped to the file browser region
const FILEBROWSER_CONTEXT_PATTERN =
  /File Browser Section|jp-DirListing-item|#filebrowser\b/;
// The file selector dialog reuses the directory listing markup, but the
// `page.filebrowser` helpers only drive the sidebar widget, so a selector
// scoped to a dialog has no helper to recommend.
const DIALOG_CONTEXT_PATTERN = /jp-Dialog\b/;
// A dotted file name inside a text match: `text=lorenz.py`,
// `:has-text("bar.vl.json")`. The dot must sit between word
// characters and only inside the text portion (which ends at `>>`), so CSS
// selectors like `span.lm-Menu-itemLabel` or `text=Close >> button.jp-Button`
// are not mistaken for file names.
const FILE_TEXT_PATTERN = /(?:text=|has-text\()["']?[^>"')]*\w\.\w/;
// The name a text match looks for: `text=notebooks`, `:has-text("mydir")`.
// Requires at least one word character, so the leftover static text of a
// fully interpolated name (`` `text=${dirName}` ``) does not count as a name.
const TEXT_MATCH_NAME_PATTERN = /(?:text=|has-text\()["']?([^>"')]*\w[^>"')]*)/;

const galataPreferFilebrowserHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-filebrowser-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata filebrowser and notebook helpers over raw Playwright selectors for JupyterLab file browser interactions'
    },
    messages: {
      preferNotebookOpenByPath:
        'Prefer `page.notebook.openByPath(path)` (or `page.notebook.open(name)`) over raw selectors to open a notebook.',
      preferOpenHomeDirectory:
        'Prefer `page.filebrowser.openHomeDirectory()` over clicking the home breadcrumb (`.jp-BreadCrumbs-home`) directly.',
      preferOpenDirectory:
        'Prefer `page.filebrowser.openDirectory(path)` over double-clicking a directory. Note that `page.filebrowser.open(filePath)` and `page.notebook.openByPath(filePath)` already open the intermediate directories of the file they are given.',
      preferFilebrowserHelper:
        'Prefer the Galata `page.filebrowser` helper (e.g. `page.filebrowser.open(path)` for a file, `page.filebrowser.openDirectory(path)` for a directory) over raw file browser selectors.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const match = matchSelectorInteraction(node);
        if (!match) {
          return;
        }

        // Right-clicks open the context menu
        if (match.isRightClick) {
          return;
        }

        const selectorText = combineStaticSelectorText(match);
        if (selectorText === null) {
          return;
        }

        // The dialog is not the file browser widget the helpers drive.
        if (DIALOG_CONTEXT_PATTERN.test(selectorText)) {
          return;
        }

        // Double-clicking is the open gesture.
        const opensTarget = match.interactionMethod === 'dblclick';

        if (opensTarget && NOTEBOOK_FILE_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferNotebookOpenByPath'
          });
          return;
        }

        if (BREADCRUMBS_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferOpenHomeDirectory'
          });
          return;
        }

        // Double-clicked file browser items and file names are opens; a
        // waitForSelector on the file browser has helper waits instead.
        if (
          opensTarget &&
          (FILEBROWSER_CONTEXT_PATTERN.test(selectorText) ||
            FILE_TEXT_PATTERN.test(selectorText))
        ) {
          // A name without a dot is a directory, which `open()` cannot handle:
          // it waits for a document tab that a directory never opens.
          const matchedName = TEXT_MATCH_NAME_PATTERN.exec(selectorText)?.[1];
          const opensDirectory =
            matchedName !== undefined && !matchedName.includes('.');
          context.report({
            node: match.callNode,
            messageId: opensDirectory
              ? 'preferOpenDirectory'
              : 'preferFilebrowserHelper'
          });
          return;
        }

        if (
          match.interactionMethod === 'waitForSelector' &&
          FILEBROWSER_CONTEXT_PATTERN.test(selectorText)
        ) {
          context.report({
            node: match.callNode,
            messageId: 'preferFilebrowserHelper'
          });
        }
      }
    };
  }
});

export = galataPreferFilebrowserHelper;
