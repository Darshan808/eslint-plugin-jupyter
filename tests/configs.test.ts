/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import plugin from '../src/index';

function ruleNames(rules: Record<string, unknown> = {}): string[] {
  return Object.keys(rules);
}

describe('configs', () => {
  const ruleIds = Object.keys(plugin.rules);

  it('recommended uses the flat config namespace', () => {
    for (const block of plugin.configs.recommended) {
      for (const name of ruleNames(block.rules)) {
        expect(name).toMatch(/^jupyter\//);
        expect(ruleIds).toContain(name.slice('jupyter/'.length));
      }
    }
  });

  // eslintrc registers `@jupyter/eslint-plugin` as `@jupyter`, so its rules
  // must be named `@jupyter/<rule>` (see jupyterlab/eslint-plugin#144).
  it('recommended-legacy uses the eslintrc namespace', () => {
    const legacy = plugin.configs['recommended-legacy'];
    expect(legacy.plugins).toEqual(['@jupyter']);
    const names = [
      ...ruleNames(legacy.rules),
      ...legacy.overrides.flatMap(o => ruleNames(o.rules))
    ];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^@jupyter\//);
      expect(ruleIds).toContain(name.slice('@jupyter/'.length));
    }
  });
});
