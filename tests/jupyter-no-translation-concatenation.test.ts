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

    // Variables resolving to a static string are extractable
    { code: `const MSG = 'Delete'; trans.__(MSG);` },
    { code: 'const MSG = `Delete`; trans.__(MSG);' },
    { code: `const MSG = 'a' + 'b'; trans.__(MSG);` },

    // Variables we cannot resolve with confidence are left alone, so generic
    // translation helpers do not light up
    { code: `function t(key: string) { return trans.__(key); }` },
    { code: `items.map(s => trans.__(s))` },
    { code: `import { MSG } from './messages'; trans.__(MSG);` },
    { code: 'let m = "a"; m = `b${x}`; trans.__(m);' },

    // Both ternary branches are extractable
    { code: `trans.__(cond ? 'Yes' : 'No')` },

    // Out of scope by design: calls and member access
    { code: `trans.__(labels[i])` },
    { code: `trans.__(err.message)` },
    { code: `trans.__(format(x))` },

    // Other bundle methods, all-static arguments
    { code: `trans._n('%1 file', '%1 files', n)` },
    { code: `trans._p('menu', 'Open')` },
    { code: `trans._np('menu', '%1 file', '%1 files', n)` },
    { code: `trans.gettext('Delete')` },
    { code: `trans.ngettext('%1 file', '%1 files', n)` },
    { code: `trans.pgettext('menu', 'Open')` },
    { code: `trans.npgettext('menu', '%1 file', '%1 files', n)` },
    { code: `trans.dcnpgettext(domain, 'menu', '%1 file', '%1 files', n)` },

    // Dynamic values outside the extracted argument slots are fine
    { code: 'trans.__("Total %1", `${a}${b}`)' },
    { code: 'trans._n("%1 file", "%1 files", `${n}`)' },
    { code: `trans.__('Delete %1', 'a' + b)` }
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
      errors: [{ messageId: 'noConcatenation' }]
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

    // A dynamic string reaching the call through a variable — the exact
    // shape reported in jupyter/notebook#8013
    {
      code:
        'let text = `Kernel ${Text.titleCase(status)}`;\n' +
        'widget.node.textContent = trans.__(text);',
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    {
      code: `const text = 'Kernel ' + status; trans.__(text);`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    // Multi-hop indirection
    {
      code: 'const a = `x ${y}`; const b = a; trans.__(b);',
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

    // Only one branch of the ternary is extractable
    {
      code: 'trans.__(cond ? "Yes" : `No ${x}`)',
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

    // A nested violation is reported once by the inner call, not twice
    {
      code: 'trans.__(format(trans.__(`Delete ${fileName}`)))',
      errors: [{ messageId: 'noInterpolation' }]
    }
  ]
});
