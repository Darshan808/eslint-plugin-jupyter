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
    // Literal concatenation stays readable, so it is a fine way to break up a
    // long message
    {
      code: `trans.__('Part 1 of long message.\\n' + 'Part 2 of long message.\\n')`
    },
    // A template literal with nothing interpolated is as static as a quote
    { code: 'trans.__(`a` + `b`)' },

    // Concatenation outside the extracted message slots is fine
    { code: `trans._n('%1 file', '%1 files', a + b)` },
    // The domain selects a catalog, it is not extracted message text
    { code: `trans.dcnpgettext(domain + suffix, 'menu', 'a', 'b', n)` },

    // Not a translation bundle
    { code: `other.trans.__("Delete " + fileName)` },
    { code: `getBundle().__("Delete " + fileName)` },
    // The extractor matches by name, so computed access is not a match
    { code: `trans["__"]("Delete " + fileName)` },
    { code: `this["trans"].__("Delete " + fileName)` },
    // No message argument to check
    { code: `trans.__()` },

    // Not a concatenation — no-dynamic-translation reports these instead
    { code: 'trans.__(`Delete ${fileName}`)' },
    // The `+` is not what reaches the message slot; the call result is
    { code: `trans.__(("Delete " + fileName).trim())` }
  ],

  invalid: [
    // Each recognized bundle receiver
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
      code: `props.trans.__("Hello " + name)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `this.props.trans.__("Hello " + name)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    // A TypeScript wrapper does not change which bundle the call is on
    {
      code: `this.trans!.__("Delete " + fileName)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `(trans as any).__("Delete " + fileName)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    // ...nor what reaches the message slot
    {
      code: `trans.__(("Delete " + fileName) as string)`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    // A template literal is static only with nothing interpolated into it
    {
      code: 'trans.__(`Delete ` + `${fileName}`)',
      errors: [{ messageId: 'noConcatenation' }]
    },

    // Each method's own message positions
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
