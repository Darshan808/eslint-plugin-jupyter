/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { visitorKeys, getKeys } from '@typescript-eslint/visitor-keys';

export type WalkAction = 'skip-children' | 'stop' | undefined;

export function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Iterative AST walk from `root`, visiting every node. The visitor may return
 * 'skip-children' to avoid descending into a node, or 'stop' to abort the
 * whole walk.
 *
 * Children come from the parser's visitor keys, so `parent` is never followed
 * and a node's `loc` and `range` are never read as children.
 */
export function walkFrom(
  root: TSESTree.Node,
  visit: (node: TSESTree.Node) => WalkAction
): void {
  const stack: TSESTree.Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const action = visit(node);
    if (action === 'stop') {
      return;
    }
    if (action === 'skip-children') {
      continue;
    }
    const keys = visitorKeys[node.type] ?? getKeys(node);
    for (const key of keys) {
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (isNode(item)) {
            stack.push(item);
          }
        }
      } else if (isNode(child)) {
        stack.push(child);
      }
    }
  }
}
