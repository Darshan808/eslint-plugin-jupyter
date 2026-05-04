/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../src/rules/require-soft-assertions-before-snapshots';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('require-soft-assertions-before-snapshots', rule, {
  valid: [
    {
      code: `
        test('single hard snapshot', async () => {
          expect(await page.screenshot()).toMatchSnapshot('page.png');
        });
      `
    },
    {
      code: `
        test('single soft snapshot', async () => {
          expect.soft(await page.screenshot()).toMatchSnapshot('page.png');
        });
      `
    },
    {
      code: `
        test('all soft', async () => {
          expect.soft(await popup.screenshot()).toMatchSnapshot('before.png');
          await popup.locator('button').click();
          expect.soft(await popup.screenshot()).toMatchSnapshot('after.png');
          expect.soft(await popup.screenshot()).toMatchSnapshot();
        });
      `
    },
    {
      code: `
        test('soft except last', async () => {
          expect.soft(await popup.screenshot()).toMatchSnapshot('before.png');
          await popup.locator('button').click();
          expect(await popup.screenshot()).toMatchSnapshot('after.png');
        });
      `
    },
    {
      code: `
        test('non-snapshot hard assertion ok', async () => {
          expect.soft(await popup.screenshot()).toMatchSnapshot('before.png');
          await expect(popup.locator('h1')).toBeVisible();
          expect(await popup.screenshot()).toMatchSnapshot('after.png');
        });
      `
    },
    {
      code: `
        test.beforeAll('test beforeAll', async () => {
          expect.soft(await page.screenshot()).toMatchSnapshot('before.png');
          expect(await page.screenshot()).toMatchSnapshot('after.png');
        });
      `
    },
    {
      code: `
        it('using it', async () => {
          expect.soft(await page.screenshot()).toMatchSnapshot('before.png');
          expect(await page.screenshot()).toMatchSnapshot('after.png');
        });
      `
    },
    // Nested test blocks: inner test has soft-before-last pattern
    {
      code: `
        test('outer', async () => {
          test('inner', async () => {
            expect.soft(await page.screenshot()).toMatchSnapshot('a.png');
            expect(await page.screenshot()).toMatchSnapshot('b.png');
          });
        });
      `
    }
  ],

  invalid: [
    {
      code: `
        test('two snapshots first hard', async () => {
          expect(await page.screenshot()).toMatchSnapshot('before.png');
          expect(await page.screenshot()).toMatchSnapshot('after.png');
        });
      `,
      errors: [{ messageId: 'requireSoftAssertion' }]
    },
    {
      code: `
        it('hard soft hard', async () => {
          expect(await page.screenshot()).toMatchSnapshot('a.png');
          expect.soft(await page.screenshot()).toMatchSnapshot('b.png');
          expect(await page.screenshot()).toMatchSnapshot('c.png');
        });
      `,
      errors: [{ messageId: 'requireSoftAssertion' }]
    },
    {
      code: `
        test.beforeAll('soft hard hard', async () => {
          expect.soft(await page.screenshot()).toMatchSnapshot('a.png');
          expect(await page.screenshot()).toMatchSnapshot('b.png');
          expect(await page.screenshot()).toMatchSnapshot('c.png');
        });
      `,
      errors: [{ messageId: 'requireSoftAssertion' }]
    },
    // Nested test block: outer test has violation
    {
      code: `
        test('outer with violation', async () => {
          expect(await page.screenshot()).toMatchSnapshot('outer-a.png');
          test('inner', async () => {
            expect.soft(await page.screenshot()).toMatchSnapshot('inner-a.png');
            expect(await page.screenshot()).toMatchSnapshot('inner-b.png');
          });
          expect(await page.screenshot()).toMatchSnapshot('outer-b.png');
        });
      `,
      errors: [{ messageId: 'requireSoftAssertion' }]
    }
  ]
});
