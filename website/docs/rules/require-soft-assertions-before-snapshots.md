# `require-soft-assertions-before-snapshots`

Require `expect.soft()` for snapshot assertions that are not the last in a Playwright test block.

## Why

Playwright's `toMatchSnapshot()` paired with a hard `expect()` call short-circuits on the first failure: subsequent snapshot assertions never run, so their snapshots cannot be captured or updated in the same run. Using `expect.soft()` for all but the last snapshot ensures every snapshot is evaluated even when one fails, keeping the full suite updatable with `--update-snapshots`.

## Rule details

The rule inspects any callback passed to `test(...)`, `it(...)`, or their dot-property variants — including modifiers (`test.only`, `test.skip`, `test.fixme`, `test.fail`) and hooks (`test.beforeAll`, `test.beforeEach`, `test.afterAll`, `test.afterEach`) — and collects every `expect(...).toMatchSnapshot(...)` call found within that callback. When a block contains more than one snapshot assertion:

- All assertions **except the last** must use `expect.soft(...)`.
- The last assertion may use either `expect(...)` or `expect.soft(...)`.
- Non-snapshot assertions (e.g. `await expect(locator).toBeVisible()`) are ignored entirely.

## Incorrect

```ts
test('multi-step screenshot', async ({ page }) => {
  expect(await page.screenshot()).toMatchSnapshot('step-1.png'); // ❌ not last, must be soft
  await page.click('button');
  expect(await page.screenshot()).toMatchSnapshot('step-2.png'); // ❌ not last, must be soft
  expect.soft(await page.screenshot()).toMatchSnapshot('step-3.png');
});
```

## Correct

```ts
test('multi-step screenshot', async ({ page }) => {
  expect.soft(await page.screenshot()).toMatchSnapshot('step-1.png');
  await page.click('button');
  expect.soft(await page.screenshot()).toMatchSnapshot('step-2.png');
  expect(await page.screenshot()).toMatchSnapshot('step-3.png'); // last — hard is fine
});
```

A single snapshot per test requires no change:

```ts
test('single screenshot', async ({ page }) => {
  expect(await page.screenshot()).toMatchSnapshot('page.png'); // only snapshot — fine
});
```

## Options

This rule has no options.
