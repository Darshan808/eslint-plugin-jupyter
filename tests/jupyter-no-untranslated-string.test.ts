/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noUntranslatedString from '../src/rules/no-untranslated-string';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('no-untranslated-string', noUntranslatedString, {
  valid: [
    // --- addCommand: translated values ---
    {
      code: `
        commands.addCommand('file-download', {
          label: trans.__('Download'),
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: () => trans.__('Download'),
          execute: () => {}
        });
      `
    },
    {
      code: `
        commands.addCommand('file-download', {
          label: trans.__('Save'),
          caption: trans.__('Save notebook'),
          execute: () => {}
        });
      `
    },
    // --- addCommand: non-literal values ---
    {
      code: `
        commands.addCommand('file-download', {
          label: someVar,
          execute: () => {}
        });
      `
    },
    // --- addCommand: empty strings ---
    {
      code: `
        commands.addCommand('file-download', {
          label: '',
          execute: () => {}
        });
      `
    },
    // --- setAttribute: translated values ---
    { code: `el.setAttribute('aria-label', trans.__('main sidebar'));` },
    { code: `el.setAttribute('title', trans.__('Close Tab'));` },
    // --- direct property assignment: translated ---
    { code: `el.title = trans.__('Close Tab');` },
    { code: `el.ariaLabel = trans.__('Search results');` },
    // --- title.label / title.caption: translated ---
    { code: `this.title.label = trans.__('Source');` },
    { code: `this.title.caption = trans.__('Source file');` },
    // --- showDialog: translated options ---
    {
      code: `
        showDialog({
          title: trans.__('Build Recommended'),
          body,
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: trans.__('Build') })]
        });
      `
    },
    // --- new Dialog: translated options ---
    {
      code: `
        const dialog = new Dialog({
          title: trans.__('Select Kernel'),
          body,
          buttons
        });
      `
    },

    // --- Dialog button builders: translated label ---
    { code: `Dialog.okButton({ label: trans.__('Build') });` },
  ],

  invalid: [
    // --- addCommand: raw string in label ---
    {
      code: `
        commands.addCommand('file-download', {
          label: 'Download',
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
    // --- addCommand: raw string in caption ---
    {
      code: `
        commands.addCommand('file-save', {
          caption: 'Save file',
          execute: () => {}
        });
      `,
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'caption' } }
      ]
    },
    // --- addCommand: raw string in usage ---
    {
      code: `
        commands.addCommand('filebrowser:open', {
          usage: 'Opens the file browser',
          execute: () => {}
        });
      `,
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'usage' } }
      ]
    },
    // --- addCommand: concise arrow returning raw string ---
    {
      code: `
        commands.addCommand(CommandIDs.close, {
          label: () => 'Close Tab',
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
    // --- addCommand: template literal ---
    {
      code: `
        commands.addCommand('file-download', {
          label: \`Download\`,
          execute: () => {}
        });
      `,
      errors: [{ messageId: 'untranslatedCommandProp', data: { prop: 'label' } }]
    },
    // --- setAttribute: raw string with aria-label ---
    {
      code: `el.setAttribute('aria-label', 'main sidebar');`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'aria-label' } }
      ]
    },
    // --- setAttribute: raw string with title ---
    {
      code: `el.setAttribute('title', 'Close Tab');`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'title' } }
      ]
    },
    // --- setAttribute: template literal ---
    {
      code: `el.setAttribute('aria-label', \`main sidebar\`);`,
      errors: [
        { messageId: 'untranslatedSetAttribute', data: { attr: 'aria-label' } }
      ]
    },

    // --- direct property assignment: raw string to title ---
    {
      code: `el.title = 'Close Tab';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'title' } }
      ]
    },
    // --- direct property assignment: raw string to ariaLabel ---
    {
      code: `el.ariaLabel = 'Search results';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'ariaLabel' } }
      ]
    },
    // --- title.label: raw string ---
    {
      code: `this.title.label = 'Source';`,
      errors: [
        { messageId: 'untranslatedTitleProp', data: { prop: 'label' } }
      ]
    },
    // --- title.label: arbitrary receiver ---
    {
      code: `widget.title.label = 'My Panel';`,
      errors: [
        { messageId: 'untranslatedTitleProp', data: { prop: 'label' } }
      ]
    },
    // --- showDialog: raw string title ---
    {
      code: `showDialog({ title: 'Confirm' });`,
      errors: [
        { messageId: 'untranslatedDialogOption', data: { prop: 'title' } }
      ]
    },
    // --- showDialog: raw string body ---
    {
      code: `showDialog({ title: trans.__('Build'), body: 'Are you sure?' });`,
      errors: [
        { messageId: 'untranslatedDialogOption', data: { prop: 'body' } }
      ]
    },
    // --- new Dialog: raw string title ---
    {
      code: `const d = new Dialog({ title: 'Select Kernel', body });`,
      errors: [
        { messageId: 'untranslatedDialogOption', data: { prop: 'title' } }
      ]
    },

    // --- Dialog button builders: raw string label ---
    {
      code: `Dialog.okButton({ label: 'Build' });`,
      errors: [{ messageId: 'untranslatedDialogButtonLabel' }]
    },
  ]
});

// JSX tests require a separate tester with JSX parsing enabled
const jsxRuleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true }
    }
  }
});

jsxRuleTester.run('no-untranslated-string (JSX)', noUntranslatedString, {
  valid: [
    // --- JSX: translated expression ---
    { code: `const el = <span>{trans.__('Error message:')}</span>;` },
    { code: `const el = (\n  <div>\n    <span>{trans.__('Label')}</span>\n  </div>\n);` },
    { code: `<div className={'normal-class-string'} />` },
    { code: `<div id={'my-id'} />` },
    { code: `<span aria-label={trans.__('Close')} />` },
    // Punctuation-only JSX text should not be flagged
    { code: `<span>,</span>` },
    { code: `<span>{' + '}</span>` }
  ],

  invalid: [
    // --- JSXText: raw text content ---
    {
      code: `const el = <span>Hello world</span>;`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    // --- JSXExpressionContainer: raw string literal ---
    {
      code: `const el = <span>{'raw string'}</span>;`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    // --- JSX accessibility attributes must be translated ---
    {
      code: `<button aria-label={'Close dialog'} />`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    {
      code: `<div title={'My tooltip'} />`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    {
      code: `<span aria-description={'Describes something'} />`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    {
      code: `<span aria-description="Describes something" />`,
      errors: [{ messageId: 'untranslatedJsxText' }]
    }
  ]
});

// enforcePunctuation option tests
jsxRuleTester.run('no-untranslated-string (JSX, enforcePunctuation)', noUntranslatedString, {
  valid: [
    // Empty strings still ignored even with enforcePunctuation
    { code: `<span>{''}</span>`, options: [{ enforcePunctuation: true }] }
  ],
  invalid: [
    // Punctuation-only JSX text flagged when enforcePunctuation: true
    {
      code: `<div>,</div>`,
      options: [{ enforcePunctuation: true }],
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    {
      code: `<span>{' - '}</span>`,
      options: [{ enforcePunctuation: true }],
      errors: [{ messageId: 'untranslatedJsxText' }]
    },
    {
      code: `<span>{'.'}</span>`,
      options: [{ enforcePunctuation: true }],
      errors: [{ messageId: 'untranslatedJsxText' }]
    }
  ]
});
