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

    // Template literals without interpolation are as static as quoted strings
    { code: 'trans.__(`a` + `b`)' },
    { code: 'trans.__(`a` + "b")' },

    // Other bundle methods, all-static message arguments
    { code: `trans._n('%1 file', '%1 files', n)` },
    { code: `trans._p('menu', 'Open')` },
    { code: `trans._np('menu', '%1 file', '%1 files', n)` },
    { code: `trans.gettext('Delete')` },
    { code: `trans.ngettext('%1 file', '%1 files', n)` },
    { code: `trans.pgettext('menu', 'Open')` },
    { code: `trans.npgettext('menu', '%1 file', '%1 files', n)` },
    // The domain selects a catalog, it is not extracted message text
    { code: `trans.dcnpgettext(domain + suffix, 'menu', 'a', 'b', n)` },

    // Concatenation outside the extracted argument slots is fine
    { code: `trans._n('%1 file', '%1 files', a + b)` },
    { code: `trans._p('menu', 'Open', a + b)` },

    // Not a translation bundle
    { code: `logger.__("Delete " + fileName)` },
    { code: `other.trans.__("Delete " + fileName)` },

    // Not a concatenation at all — no-dynamic-translation reports these
    { code: 'trans.__(`Delete ${fileName}`)' },
    { code: `trans.__(message)` },
    // The `+` is not what reaches the message slot; the call result is
    { code: `trans.__(("Delete " + fileName).trim())` },
    { code: `trans.__(items.map(s => "p" + s).join(""))` }
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
      code: `this.props.trans.__("Hello " + name)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    // A TypeScript wrapper does not change what reaches the message slot
    {
      code: `trans.__(("Delete " + fileName) as string)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    // A template literal is static only with nothing interpolated into it
    {
      code: 'trans.__(`Delete ` + `${fileName}`)',
      errors: [{ messageId: 'noConcatenation' }]
    },

    // Non-`__` bundle methods, at their own extracted argument positions
    {
      code: `trans.gettext("Hi " + x)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `trans._n("%1 file", "%1 " + word, n)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `trans._p("menu " + section, "Open")`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `trans._np("menu", "%1 file", "%1 " + word, n)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `trans.dcnpgettext(domain, "menu", "Open " + name, "Opens", n)`,
      errors: [{ messageId: 'noConcatenation' }]
    },

    // Each extracted argument is reported independently
    {
      code: `trans._n("%1 " + a, "%1 " + b, n)`,
      errors: [
        { messageId: 'noConcatenation' },
        { messageId: 'noConcatenation' }
      ]
    },

    // A nested call reports on its own, not through the outer one
    {
      code: `trans.__(format(trans.__("Delete " + fileName)))`,
      errors: [{ messageId: 'noConcatenation' }]
    }
  ]
});
