/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import plugin from '../src';

const code = `
import { JupyterFrontEndPlugin } from '@jupyterlab/application';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'my-extension:plugin',
  activate: () => {}
};

export default plugin;
`;

function lint(config: Linter.Config[]): Linter.LintMessage[] {
  return new Linter({ configType: 'flat' }).verify(
    code,
    [{ languageOptions: { parser: tsParser } }, ...config],
    'src/index.ts'
  );
}

describe('configs.recommended', () => {
  const recommended = plugin.configs.recommended as Linter.Config[];

  it('registers the plugin in every entry', () => {
    for (const entry of recommended) {
      expect(entry.plugins).toEqual({ jupyter: plugin });
    }
  });

  it('works without a separate plugins entry', () => {
    const messages = lint(recommended);

    expect(messages.map(message => message.ruleId)).toEqual([
      'jupyter/plugin-description'
    ]);
  });

  it('still works alongside a separate plugins entry', () => {
    const messages = lint([
      { plugins: { jupyter: plugin as never } },
      ...recommended
    ]);

    expect(messages.map(message => message.ruleId)).toEqual([
      'jupyter/plugin-description'
    ]);
  });
});
