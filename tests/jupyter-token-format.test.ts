/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import tokenFormat from '../src/rules/token-format';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('token-format', tokenFormat, {
  valid: [
    {
      // Standard format
      code: `new Token<IFoo>('@test/pkg:IFoo', 'A test service')`
    },
    {
      code: `new Token<void>('@test/pkg:IFoo')`
    },
    {
      // Package name with hyphens is fine — only the symbol after ':' is checked
      code: `new Token<void>('@test/my-pkg:IFoo')`
    },
    {
      // Underscore prefix in symbol
      code: `new Token<void>('@test/pkg:_IPrivate')`
    },
    {
      // new Token() with no arguments is skipped
      code: `new Token()`
    },
    {
      // new Token(variable) is skipped — non-literal first arg
      code: `new Token(myTokenId)`
    },
    {
      // Template literal first arg cannot be statically validated — skipped
      code: 'new Token(`@test/pkg:kebab-case`)'
    },
    {
      // Unrelated new expressions are not checked
      code: `new SomeOtherClass('@test/pkg:kebab-case', 'desc')`
    },
  ],

  invalid: [
    {
      // Kebab-case symbol
      code: `new Token<IFoo>('@test/pkg:foo-service', 'A test service')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: {
            tokenId: '@test/pkg:foo-service',
            symbol: 'foo-service'
          }
        }
      ]
    },
    {
      // No colon at all
      code: `new Token<void>('testpkgIFoo')`,
      errors: [
        {
          messageId: 'missingColon',
          data: { tokenId: 'testpkgIFoo' }
        }
      ]
    },
    {
      // Empty symbol after colon
      code: `new Token<void>('@test/pkg:')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: { tokenId: '@test/pkg:', symbol: '' }
        }
      ]
    },
    {
      // Symbol with a dot
      code: `new Token<void>('@test/pkg:IFoo.IBar')`,
      errors: [
        {
          messageId: 'invalidTokenSymbol',
          data: { tokenId: '@test/pkg:IFoo.IBar', symbol: 'IFoo.IBar' }
        }
      ]
    }
  ]
});
