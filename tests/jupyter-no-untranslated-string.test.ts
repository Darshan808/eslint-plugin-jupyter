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
    { code: `Dialog.okButton({ label: trans.__('Build') });` }
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
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'label' } }
      ]
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
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'label' } }
      ]
    },
    // --- addCommand: template literal ---
    {
      code: `
        commands.addCommand('file-download', {
          label: \`Download\`,
          execute: () => {}
        });
      `,
      errors: [
        { messageId: 'untranslatedCommandProp', data: { prop: 'label' } }
      ]
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
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'label' } }
      ]
    },
    // --- title.label: arbitrary receiver ---
    {
      code: `widget.title.label = 'My Panel';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'label' } }
      ]
    },
    // --- title.caption: raw string ---
    {
      code: `this.title.caption = 'Source file';`,
      errors: [
        { messageId: 'untranslatedPropertyAssign', data: { prop: 'caption' } }
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
    }
  ]
});

// checkProperties tests
ruleTester.run(
  'no-untranslated-string (checkProperties)',
  noUntranslatedString,
  {
    valid: [
      // Translated
      { code: `const field = new MyField({ label: trans.__('My field') });` },
      // Non-literal
      { code: `const field = new MyField({ label: someVar });` },
      // Empty
      { code: `const field = new MyField({ label: '' });` },
      // Shorthand is a reference, not a literal
      { code: `const opts = { label };` },
      // Computed keys are not tracked
      { code: `const opts = { [label]: 'My field' };` },
      // Property names outside the list are ignored
      { code: `const opts = { id: 'my-id', className: 'my-class' };` },
      { code: `const opts = { label: '-' };` },
      // An empty list disables the check
      {
        code: `const opts = { label: 'My field' };`,
        options: [{ checkProperties: [] }]
      },
      // A custom list replaces the default one
      {
        code: `const opts = { label: 'My field' };`,
        options: [{ checkProperties: ['caption'] }]
      }
    ],
    invalid: [
      // A `label` on an arbitrary constructor
      {
        code: `
          const field = new MyField({
            factory,
            label: 'My field',
            translator: translator
          });
        `,
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      // Plain object literal
      {
        code: `const opts = { label: 'My field' };`,
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      // `category` is checked by default too
      {
        code: `launcher.add({ command, category: 'Notebook' });`,
        errors: [
          { messageId: 'untranslatedProperty', data: { prop: 'category' } }
        ]
      },
      // Quoted key
      {
        code: `const opts = { 'label': 'My field' };`,
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      // Template literal and concise arrow function
      {
        code: `const opts = { label: \`My field\` };`,
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      {
        code: `const opts = { label: () => 'My field' };`,
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      // Nested properties are all reported
      {
        code: `const opts = { label: 'Outer', child: { label: 'Inner' } };`,
        errors: [
          { messageId: 'untranslatedProperty', data: { prop: 'label' } },
          { messageId: 'untranslatedProperty', data: { prop: 'label' } }
        ]
      },
      // A custom list replaces the default one
      {
        code: `const opts = { label: 'My field', caption: 'My caption' };`,
        options: [{ checkProperties: ['caption'] }],
        errors: [
          { messageId: 'untranslatedProperty', data: { prop: 'caption' } }
        ]
      },
      // More specific branches still win, without duplicate reports
      {
        code: `
          commands.addCommand('file-download', {
            label: 'Download',
            execute: () => {}
          });
        `,
        errors: [
          { messageId: 'untranslatedCommandProp', data: { prop: 'label' } }
        ]
      },
      {
        code: `Dialog.okButton({ label: 'Build' });`,
        errors: [{ messageId: 'untranslatedDialogButtonLabel' }]
      }
    ]
  }
);

// checkAssignments tests
ruleTester.run(
  'no-untranslated-string (checkAssignments)',
  noUntranslatedString,
  {
    valid: [
      { code: `widget.label = trans.__('Save');` },
      { code: `this.label = trans.__('Save');` },
      { code: `node.textContent = trans.__('Save');` },
      { code: `img.alt = trans.__('A diagram');` },
      // Not in the default list
      { code: `el.className = 'my-class';` },
      { code: `el.id = 'my-id';` },
      { code: `item.textContent = '/';` },
      { code: `title.textContent = '-';` },
      { code: `anchor.textContent = '¶';` },
      { code: `widget.label = ' … ';` },
      // An empty list disables the check
      { code: `widget.label = 'Save';`, options: [{ checkAssignments: [] }] },
      // Dropping `label` also drops the Lumino widget title check
      {
        code: `widget.title.label = 'Source';`,
        options: [{ checkAssignments: ['title'] }]
      },
      // A custom list replaces the default one
      {
        code: `widget.label = 'Save';`,
        options: [{ checkAssignments: ['textContent'] }]
      },
      // Compound assignment is not a plain assignment
      { code: `el.textContent += 'Save';` }
    ],
    invalid: [
      {
        code: `widget.label = 'Save';`,
        errors: [
          { messageId: 'untranslatedPropertyAssign', data: { prop: 'label' } }
        ]
      },
      {
        code: `this.label = 'Save';`,
        errors: [
          { messageId: 'untranslatedPropertyAssign', data: { prop: 'label' } }
        ]
      },
      {
        code: `node.textContent = 'Save';`,
        errors: [
          {
            messageId: 'untranslatedPropertyAssign',
            data: { prop: 'textContent' }
          }
        ]
      },
      {
        code: `img.alt = 'A diagram';`,
        errors: [
          { messageId: 'untranslatedPropertyAssign', data: { prop: 'alt' } }
        ]
      },
      // A custom list replaces the default one
      {
        code: `el.placeholder = 'Search';`,
        options: [{ checkAssignments: ['placeholder'] }],
        errors: [
          {
            messageId: 'untranslatedPropertyAssign',
            data: { prop: 'placeholder' }
          }
        ]
      },
      // Lumino widget titles fall out of `label` / `caption` being listed
      {
        code: `widget.title.label = 'Source';`,
        errors: [
          { messageId: 'untranslatedPropertyAssign', data: { prop: 'label' } }
        ]
      },
      {
        code: `widget.title.caption = 'Source file';`,
        errors: [
          { messageId: 'untranslatedPropertyAssign', data: { prop: 'caption' } }
        ]
      }
    ]
  }
);

// enforcePunctuation applies to every position, not just JSX
ruleTester.run(
  'no-untranslated-string (enforcePunctuation)',
  noUntranslatedString,
  {
    valid: [
      // Blank strings stay ignored even with enforcePunctuation on
      {
        code: `item.textContent = '';`,
        options: [{ enforcePunctuation: true }]
      },
      {
        code: `const opts = { label: '   ' };`,
        options: [{ enforcePunctuation: true }]
      }
    ],
    invalid: [
      {
        code: `item.textContent = '/';`,
        options: [{ enforcePunctuation: true }],
        errors: [
          {
            messageId: 'untranslatedPropertyAssign',
            data: { prop: 'textContent' }
          }
        ]
      },
      {
        code: `const opts = { label: '-' };`,
        options: [{ enforcePunctuation: true }],
        errors: [{ messageId: 'untranslatedProperty', data: { prop: 'label' } }]
      },
      {
        code: `commands.addCommand('sep', { label: '-', execute: () => {} });`,
        options: [{ enforcePunctuation: true }],
        errors: [
          { messageId: 'untranslatedCommandProp', data: { prop: 'label' } }
        ]
      }
    ]
  }
);

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
    {
      code: `const el = (\n  <div>\n    <span>{trans.__('Label')}</span>\n  </div>\n);`
    },
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
      errors: [
        { messageId: 'untranslatedJsxAttribute', data: { prop: 'aria-label' } }
      ]
    },
    {
      code: `<div title={'My tooltip'} />`,
      errors: [
        { messageId: 'untranslatedJsxAttribute', data: { prop: 'title' } }
      ]
    },
    {
      code: `<span aria-description={'Describes something'} />`,
      errors: [
        {
          messageId: 'untranslatedJsxAttribute',
          data: { prop: 'aria-description' }
        }
      ]
    },
    {
      code: `<span aria-description="Describes something" />`,
      errors: [
        {
          messageId: 'untranslatedJsxAttribute',
          data: { prop: 'aria-description' }
        }
      ]
    }
  ]
});

// checkJsxAttributes tests
jsxRuleTester.run(
  'no-untranslated-string (JSX, checkJsxAttributes)',
  noUntranslatedString,
  {
    valid: [
      { code: `<MyCheckbox label={trans.__('Enable feature')} />` },
      // An empty list disables the check
      {
        code: `<MyCheckbox label="Enable feature" />`,
        options: [{ checkJsxAttributes: [] }]
      },
      // A custom list replaces the default one
      {
        code: `<MyCheckbox label="Enable feature" />`,
        options: [{ checkJsxAttributes: ['placeholder'] }]
      }
    ],
    invalid: [
      {
        code: `<MyCheckbox label="Enable feature" />`,
        errors: [
          { messageId: 'untranslatedJsxAttribute', data: { prop: 'label' } }
        ]
      },
      {
        code: `<MyCheckbox label={'Enable feature'} />`,
        errors: [
          { messageId: 'untranslatedJsxAttribute', data: { prop: 'label' } }
        ]
      },
      // A custom list replaces the default one
      {
        code: `<MyInput placeholder="Search" label="Enable feature" />`,
        options: [{ checkJsxAttributes: ['placeholder'] }],
        errors: [
          {
            messageId: 'untranslatedJsxAttribute',
            data: { prop: 'placeholder' }
          }
        ]
      }
    ]
  }
);

// enforcePunctuation option tests
jsxRuleTester.run(
  'no-untranslated-string (JSX, enforcePunctuation)',
  noUntranslatedString,
  {
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
  }
);
