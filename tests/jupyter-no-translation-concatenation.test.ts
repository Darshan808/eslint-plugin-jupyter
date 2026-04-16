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
      code: `this.props.trans.__("a" + "b")`,
      errors: [{ messageId: 'noConcatenation' }]
    },
    {
      code: `props.trans.__("a" + "b")`,
      errors: [{ messageId: 'noConcatenation' }]
    }
  ]
});
