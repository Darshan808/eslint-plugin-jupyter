/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import galataPreferSidebarActivityHelper from '../src/rules/galata-prefer-sidebar-activity-helper';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run(
  'galata-prefer-sidebar-activity-helper',
  galataPreferSidebarActivityHelper,
  {
    valid: [
      // Galata helper usage is what the rule recommends
      {
        code: `await page.sidebar.openTab('jp-running-sessions');`
      },
      {
        code: `await page.activity.activateTab('Lorenz.ipynb');`
      },
      // Title selectors for elements that are not sidebar tabs (e.g. toolbar
      // buttons) are not flagged
      {
        code: `await page.click('[title="Save the notebook"]');`
      },
      // Unrelated selectors are not flagged
      {
        code: `await page.click('#submit-button');`
      },
      // Fully dynamic selector cannot be analyzed
      {
        code: `await page.click(tabSelector);`
      },
      // Non-`page` receivers are out of scope
      {
        code: `await popup.click('[title="Property Inspector"]');`
      }
    ],

    invalid: [
      {
        code: `await page.click('[title="Running Terminals and Kernels"]');`,
        errors: [{ messageId: 'preferSidebarOpenTab' }]
      },
      // Locator chain
      {
        code: `await page.locator('[title="Property Inspector"]').click();`,
        errors: [{ messageId: 'preferSidebarOpenTab' }]
      },
      {
        code: `await page.waitForSelector('[title="Table of Contents"]');`,
        errors: [{ messageId: 'preferSidebarOpenTab' }]
      },
      // Main area tabs
      {
        code: `await page.click('div[role="main"] >> text=Lorenz.ipynb');`,
        errors: [{ messageId: 'preferActivateTab' }]
      },
      // Template literal: static parts still match
      {
        code: `await page.click(\`div[role="main"] >> text=\${fileName}\`);`,
        errors: [{ messageId: 'preferActivateTab' }]
      },
      // Dock panel tab with an unknown title still matches the main area
      // pattern (exercises the title-map fallthrough)
      {
        code: `await page.click('.lm-DockPanel-tabBar li[title="Untitled.ipynb"]');`,
        errors: [{ messageId: 'preferActivateTab' }]
      }
    ]
  }
);
