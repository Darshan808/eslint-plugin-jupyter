/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noTranslationConcatenation from '../src/rules/no-translation-concatenation';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('no-translation-concatenation', noTranslationConcatenation, {
  valid: [
    { code: `trans.__("Delete %1", fileName)` },
    { code: `this.trans.__("Hello")` },
    { code: `this._trans.__("Hello %1", x)` },
    { code: `this.props.trans.__("Hello")` },
    { code: `props.trans.__("Hello %1", x)` },
    { code: `trans.__('Total %1', a + b)` },
    // Pure string literal concatenation is static — translation tools handle it
    {
      code: `trans.__('Part 1 of long message.\\n' + 'Part 2 of long message.\\n')`
    },
    { code: `this.props.trans.__("a" + "b")` },
    { code: `props.trans.__("a" + "b")` },

    // A template literal without interpolation is as static as a quoted string
    { code: 'trans.__(`Delete this file`)' },
    { code: 'trans.__(`a` + "b")' },
    { code: `trans.__("Delete" as const)` },

    // Other bundle methods, all-static message arguments
    { code: `trans._n('%1 file', '%1 files', n)` },
    { code: `trans._p('menu', 'Open')` },
    { code: `trans._np('menu', '%1 file', '%1 files', n)` },
    { code: `trans.gettext('Delete')` },
    { code: `trans.ngettext('%1 file', '%1 files', n)` },
    { code: `trans.pgettext('menu', 'Open')` },
    { code: `trans.npgettext('menu', '%1 file', '%1 files', n)` },
    // The domain selects a catalog, it is not extracted message text
    { code: `trans.dcnpgettext(domain, 'menu', '%1 file', '%1 files', n)` },

    // Dynamic values outside the extracted argument slots are fine
    { code: 'trans.__("Total %1", `${a}${b}`)' },
    { code: 'trans._n("%1 file", "%1 files", `${n}`)' },
    { code: `trans.__('Delete %1', 'a' + b)` },
    { code: `trans.__('Delete %1', ...args)` },

    // Not a translation bundle
    { code: 'logger.__(`Delete ${fileName}`)' },
    { code: 'other.trans.__(`Delete ${fileName}`)' }
  ],

  invalid: [
    {
      code: `trans.__("Delete " + fileName)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `this.trans.__("Hello " + name)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `this._trans.__("x" + y)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `trans.__(("Delete " + fileName).trim())`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },

    // Template literal interpolation — jupyter/notebook#8013
    {
      code: 'trans.__(`Delete ${fileName}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'this.trans.__(`Hello ${name}!`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'this._trans.__(`${count} items`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'props.trans.__(`Kernel ${status}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },

    // A message reaching the call through a variable is never extracted
    {
      code:
        'let text = `Kernel ${Text.titleCase(status)}`;\n' +
        'widget.node.textContent = trans.__(text);',
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `const MESSAGE = 'Delete'; trans.__(MESSAGE);`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `const text = 'Kernel ' + status; trans.__(text);`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `import { MESSAGE } from './messages'; trans.__(MESSAGE);`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `function t(key: string) { return trans.__(key); }`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `items.map(s => trans.__(s))`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },

    // Other expressions the extractor cannot read
    {
      code: `trans.__(labels[i])`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `trans.__(err.message)`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `trans.__(format(x))`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `trans.__(cond ? 'Yes' : 'No')`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `trans.__(['Delete', fileName].join(' '))`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    // A spread lands no readable text in the message slot either
    {
      code: `trans.__(...args)`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `trans._n('%1 file', ...rest)`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },

    // Non-`__` bundle methods, at their own extracted argument positions
    {
      code: 'trans.gettext(`Hi ${x}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'trans._n("%1 file", `${n} files`, n)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'trans._p("menu", `Open ${name}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: `trans._p("menu " + section, "Open")`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: 'trans._np("menu", "%1 file", `${n} files`, n)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: 'trans.dcnpgettext(domain, "menu", `Open ${name}`, "Opens", n)',
      errors: [{ messageId: 'noInterpolation' }]
    },

    // Each extracted argument is reported independently
    {
      code: 'trans._n(`${n} file`, `${n} files`, n)',
      errors: [
        { messageId: 'noInterpolation' },
        { messageId: 'noInterpolation' }
      ]
    },

    // Outer call is dynamic, inner call interpolates — both are real problems
    {
      code: 'trans.__(format(trans.__(`Delete ${fileName}`)))',
      errors: [
        { messageId: 'noDynamicMessage' },
        { messageId: 'noInterpolation' }
      ]
    }
  ]
});
