/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  name => `https://eslint-plugin.readthedocs.io/en/latest/rules/${name}/`
);