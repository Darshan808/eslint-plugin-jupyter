/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import noDynamicTranslation from '../src/rules/no-dynamic-translation';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

// The recognized bundle receivers are exercised by the
// no-translation-concatenation tests; both rules share isTransBundle.
ruleTester.run('no-dynamic-translation', noDynamicTranslation, {
  valid: [
    { code: `trans.__("Delete %1", fileName)` },
    // A template literal with nothing interpolated is as static as a quote
    { code: 'trans.__(`Delete this file`)' },
    { code: `trans.__("Delete" as const)` },

    // Concatenation belongs to no-translation-concatenation, not to this rule
    { code: `trans.__("Delete " + fileName)` },

    // Dynamic values outside the extracted message slots are fine
    { code: 'trans.__("Total %1", `${a}${b}`)' },
    { code: `trans.__('Delete %1', ...args)` },
    // The domain selects a catalog, it is not extracted message text
    { code: `trans.dcnpgettext(domain, 'menu', '%1 file', '%1 files', n)` },

    // Not a translation bundle
    { code: 'other.trans.__(`Delete ${fileName}`)' }
  ],

  invalid: [
    // Template literal interpolation — jupyter/notebook#8013
    {
      code: 'trans.__(`Delete ${fileName}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    // A TypeScript wrapper still names the same bundle, at either level
    {
      code: 'this.trans!.__(`Delete ${fileName}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },
    {
      code: '(this as any).trans.__(`Delete ${fileName}`)',
      errors: [{ messageId: 'noInterpolation' }]
    },

    // A message reaching the call through a variable is never extracted —
    // the verbatim jupyter/notebook#8013 shape
    {
      code:
        'let text = `Kernel ${Text.titleCase(status)}`;\n' +
        'widget.node.textContent = trans.__(text);',
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    // ...even when the variable plainly holds a literal
    {
      code: `const MESSAGE = 'Delete'; trans.__(MESSAGE);`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },
    // ...and a generic helper is no different
    {
      code: `function t(key: string) { return trans.__(key); }`,
      errors: [{ messageId: 'noDynamicMessage' }]
    },

    // Other expressions the extractor cannot read
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
    // A concatenation wrapped in a call is no longer a bare `+`, so it is this
    // rule's concern rather than no-translation-concatenation's
    {
      code: `trans.__(("Delete " + fileName).trim())`,
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

    // Each method's own message positions
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
