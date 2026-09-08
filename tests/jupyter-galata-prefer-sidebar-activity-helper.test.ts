/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../src/rules/galata-prefer-sidebar-activity-helper';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('galata-prefer-sidebar-activity-helper', rule, {
  valid: [
    {
      code: `await page.sidebar.openTab('jp-running-sessions');`
    },
    {
      code: `await page.activity.activateTab('Lorenz.ipynb');`
    },
    {
      code: `const tab = page.locator('[title="Property Inspector"]');`
    },
    {
      code: `await expect(page.locator('[title="Property Inspector"]')).toBeVisible();`
    },
    {
      code: `await page.click('[title="Property Inspector"]', { button: 'right' });`
    },
    {
      code: `await page.locator('[title="Property Inspector"]').click({ button: 'right' });`
    },
    {
      // A double click opens and then closes the tab.
      code: `await page.getByTitle('Debugger').click({ clickCount: 2 });`
    },
    {
      code: `await page.getByTitle('Debugger').click({ modifiers: ['Shift'] });`
    },
    {
      // `force` skips the actionability checks `openTab` relies on.
      code: `await page.getByTitle('Debugger').click({ force: true });`
    },
    {
      code: `await page.getByTitle('Debugger').click({ position: { x: 5, y: 5 } });`
    },
    {
      // A spread could carry any of the options above.
      code: `await page.getByTitle('Debugger').click({ ...options });`
    },
    {
      code: `await page.dblclick('[title="Property Inspector"]');`
    },
    {
      code: `await page.locator('[title="Property Inspector"]').dblclick();`
    },
    {
      code: `await page.click('[aria-label="Property Inspector"]');`
    },
    {
      code: `await page.click('[title="Some Extension Sidebar"]');`
    },
    {
      // `$=`, `~=` and `|=` match the end of the caption, which the file
      // browser shortcut leaves unknown.
      code: `await page.click('[title$="File Browser"]');`
    },
    {
      code: `await page.click('[title~="Debugger"]');`
    },
    {
      code: `await page.click('[title|="Debugger"]');`
    },
    {
      // The value has to fit inside the caption, not the other way round.
      code: `await page.click('[title^="Debugger Console"]');`
    },
    {
      code: `await page.click('[title*="Close Debugger"]');`
    },
    {
      // A value that fits two captions names neither.
      code: `await page.click('[title*="e"]');`
    },
    {
      code: `await page.click('#jp-main-dock-panel [title^="File Browser"]');`
    },
    {
      // A widget moved to the main area keeps its caption on the new tab.
      code: `await page.click('#jp-main-dock-panel [title="Table of Contents"]');`
    },
    {
      code: `await page.click('#jp-down-stack [title="Running Terminals and Kernels"]');`
    },
    {
      // The dock panel and the down area name their own tab bars, so the class
      // rules out a sidebar tab just as the stack node id does.
      code: `await page.click('.lm-DockPanel-tabBar [title="Table of Contents"]');`
    },
    {
      code: `await page.click('.lm-TabPanel-tabBar [title="Debugger"]');`
    },
    {
      code: `await page.locator('.lm-DockPanel-tabBar .lm-TabBar-tab[data-id="filebrowser"]').click();`
    },
    {
      // The down area is not under `[role="main"]`, so no activity helper
      // reaches its tabs either.
      code: `await page.click('.lm-TabPanel-tabBar .lm-TabBar-tab >> text=Log Console');`
    },
    {
      code: `await page.click('[role="main"] [title="File Browser"]');`
    },
    {
      // A sidebar tab bar is a Lumino tab bar too, so a tab token there does
      // not make it a main area tab.
      code: `await page.click('.jp-SideBar .lm-TabBar-tab >> text=Debugger');`
    },
    {
      code: `await page.click('#jp-down-stack .lm-TabBar-tab >> text=Log Console');`
    },
    {
      // An extension tab id the rule cannot map to a helper call.
      code: `await page.click('.lm-TabBar-tab[data-id="jupytercad::rightControlPanel"]');`
    },
    {
      code: `await page.click('#jp-main-dock-panel .lm-TabBar-tab[data-id="filebrowser"]');`
    },
    {
      // `:text-is` in a file listing names no tab and no main area.
      code: `await page.click('span.jp-DirListing-itemText > span:text-is("a.txt")');`
    },
    {
      // `:has-text` is a containment filter, so the tab it picks is ambiguous
      // when more than one matches.
      code: `await page.click('.lm-DockPanel-tabBar .lm-TabBar-tab:has-text("Terminal")');`
    },
    {
      // An extension sidebar tab: the rule cannot derive its id from the name.
      code: `await page.getByRole('tab', { name: 'Git' }).click();`
    },
    {
      // An accessible name says nothing about which area holds the tab, so on
      // its own it never reaches the activity helper.
      code: `await page.getByRole('tab', { name: 'Settings' }).click();`
    },
    {
      code: `await page.getByRole('tablist', { name: 'alternate sidebar' }).getByRole('tab', { name: 'Extension Panel' }).click();`
    },
    {
      // The settings editor plugin list carries `role="tab"` on every entry,
      // so the role alone does not make a main area tab.
      code: `await page.getByRole('tab', { name: 'Text Editor' }).getByText('Text Editor').click();`
    },
    {
      code: `await page.click('.jp-SettingsPanel [role="tab"] >> text=Text Editor');`
    },
    {
      // A scope written earlier in the chain rules the sidebar tab out too.
      code: `await page.locator('#jp-main-dock-panel').getByTitle('Debugger').click();`
    },
    {
      // One dynamic link could carry the token that rules the tab out, so the
      // whole chain is dropped.
      code: `await page.locator(\`.\${scope}\`).getByTitle('Debugger').click();`
    },
    {
      code: `await page.getByRole('tab', { name: /Results/ }).click();`
    },
    {
      code: `await page.getByRole('tab').click();`
    },
    {
      code: `await page.getByRole('button', { name: 'Debugger' }).click();`
    },
    {
      code: `await page.getByRole('tablist', { name: 'Debugger' }).click();`
    },
    {
      code: `await page.click('[title="Sessions and Tabs"]');`
    },
    {
      code: `await dialog.locator('[title="Property Inspector"]').click();`
    },
    {
      // Only a `const` is followed: a `let` could hold a different locator.
      code: `let tab = page.locator('[title="Debugger"]');\nawait tab.click();`
    },
    {
      code: `await panel.getByTitle('Debugger').click();`
    },
    {
      code: `await page.click('div[role="main"] >> text=Run');`
    },
    {
      code: `await page.click(\`[title="\${sidebarTitle}"]\`);`
    },
    {
      code: `await page.click(\`div[role="main"] >> text=\${name}.ipynb\`);`
    }
  ],

  invalid: [
    {
      code: `await page.click('[title="Running Terminals and Kernels"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Running Terminals and Kernels',
            id: 'jp-running-sessions',
            side: 'left'
          }
        }
      ]
    },
    {
      code: `await page.locator('[title="Property Inspector"]').click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Property Inspector',
            id: 'jp-property-inspector',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `await page.locator('[title="Table of Contents"]').first().click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Table of Contents',
            id: 'table-of-contents',
            side: 'left'
          }
        }
      ]
    },
    {
      code: `await page.getByTitle('Debugger').click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Debugger',
            id: 'jp-debugger-sidebar',
            side: 'right'
          }
        }
      ]
    },
    {
      // A locator held in a `const` reaches the same `page` root as the
      // inline chain, and the report is on the interaction, not the binding.
      code: `const tab = page.locator('[title="Debugger"]');\nawait tab.click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          line: 2,
          column: 7,
          data: {
            title: 'Debugger',
            id: 'jp-debugger-sidebar',
            side: 'right'
          }
        }
      ]
    },
    {
      // The file browser caption carries the keyboard shortcut, so the exact
      // form selects nothing and tests reach the tab by prefix.
      code: `await page.click('[title^="File Browser"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'File Browser',
            id: 'filebrowser',
            side: 'left'
          }
        }
      ]
    },
    {
      code: `await page.click('[title*="Property Inspector"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Property Inspector',
            id: 'jp-property-inspector',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `await page.click("[title ^= 'Table of Contents']");`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Table of Contents',
            id: 'table-of-contents',
            side: 'left'
          }
        }
      ]
    },
    {
      // A prefix that fits one caption and no other.
      code: `await page.click('[title^="Extension"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Extension Manager',
            id: 'extensionmanager.main-view',
            side: 'left'
          }
        }
      ]
    },
    {
      // Galata's own `buildTabSelector` picks the tab by `data-id`.
      code: `await page.click('.lm-TabBar.jp-SideBar .lm-TabBar-tab[data-id="filebrowser"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'File Browser',
            id: 'filebrowser',
            side: 'left'
          }
        }
      ]
    },
    {
      code: `await page.locator('.lm-TabBar-tabLabel:text-is("lorenz.py")').click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'lorenz.py' }
        }
      ]
    },
    {
      // The dock panel tab bar is the main area, so its tabs still reach the
      // activity helper even though they never reach the sidebar one.
      code: `await page.click('.lm-DockPanel-tabBar .lm-TabBar-tab >> text=Notebook.ipynb');`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Notebook.ipynb' }
        }
      ]
    },
    {
      // A tab token proves the target is a tab without `[role="main"]`.
      code: `await page.locator('div.lm-TabBar-tabLabel >> text=Notebook.ipynb').click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Notebook.ipynb' }
        }
      ]
    },
    {
      // A sidebar scope in the selector is fine: only the main area and the
      // down area rule the tab out.
      code: `await page.click('#jp-left-stack [title="Table of Contents"]');`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Table of Contents',
            id: 'table-of-contents',
            side: 'left'
          }
        }
      ]
    },
    {
      // Ruled out as a sidebar tab, the main area selector reaches the
      // activity message instead.
      code: `await page.click('#jp-main-dock-panel [role="main"] [title="File Browser"] >> text=x.ipynb');`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'x.ipynb' }
        }
      ]
    },
    {
      // `timeout` changes only how long Playwright waits for the tab.
      code: `await page.getByTitle('Debugger').click({ timeout: 100 });`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Debugger',
            id: 'jp-debugger-sidebar',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `await page.getByRole('tab', { name: 'File Browser' }).click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'File Browser',
            id: 'filebrowser',
            side: 'left'
          }
        }
      ]
    },
    {
      // `getByRole(..., { name })` matches a substring of normalized
      // whitespace, so a padded name still selects the same tab.
      code: `await page.getByRole('tab', { name: 'File Browser ' }).click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'File Browser',
            id: 'filebrowser',
            side: 'left'
          }
        }
      ]
    },
    {
      // The report is anchored on the interaction call, like the sibling
      // galata rules, so `// eslint-disable-next-line` above the statement
      // still works once prettier splits the chain over several lines.
      code: `await page\n  .getByTitle('Debugger')\n  .click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          line: 1,
          column: 7,
          data: {
            title: 'Debugger',
            id: 'jp-debugger-sidebar',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `
        // Close the sidebar
        await page.locator('[title="Property Inspector"]').click();
      `,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Property Inspector',
            id: 'jp-property-inspector',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `await page.click('div[role="main"] >> text=Lorenz.ipynb');`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Lorenz.ipynb' }
        }
      ]
    },
    {
      // `page.activity.getTabLocator` is written this way, so a chain that
      // spells it out reaches the helper it is imitating.
      code: `await page.getByRole('main').getByRole('tab', { name: 'Settings' }).click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Settings' }
        }
      ]
    },
    {
      code: `await page.getByRole('main').getByText('Notebook.ipynb').click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Notebook.ipynb' }
        }
      ]
    },
    {
      // A sidebar widget moved to the main area is an activity, so the main
      // area scope wins over the caption.
      code: `await page.getByRole('main').getByRole('tab', { name: 'File Browser' }).click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'File Browser' }
        }
      ]
    },
    {
      code: `await page.locator('.lm-TabBar.jp-SideBar').locator('[data-id="filebrowser"]').click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'File Browser',
            id: 'filebrowser',
            side: 'left'
          }
        }
      ]
    },
    {
      code: `await page.locator('.jp-SideBar').getByTitle('Property Inspector').click();`,
      errors: [
        {
          messageId: 'preferSidebarHelper',
          data: {
            title: 'Property Inspector',
            id: 'jp-property-inspector',
            side: 'right'
          }
        }
      ]
    },
    {
      code: `await page.locator('[role="main"] >> text="Notebook.ipynb"').click();`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Notebook.ipynb' }
        }
      ]
    },
    {
      code: `await page.click('div[role="main"] [role="tab"] >> text=Console 1');`,
      errors: [
        {
          messageId: 'preferActivityHelper',
          data: { tabName: 'Console 1' }
        }
      ]
    }
  ]
});
