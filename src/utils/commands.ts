/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';

/**
 * Checks if a node represents *.addCommand()
 */
export function isAddCommandCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'MemberExpression') {
    const callee = node.callee;
    if (
      callee.property.type === 'Identifier' &&
      callee.property.name === 'addCommand'
    ) {
      return true;
    }
  }
  return false;
}
