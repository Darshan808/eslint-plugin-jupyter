/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import {
  ESLintUtils,
  ParserServices,
  TSESLint
} from '@typescript-eslint/utils';
import * as ts from 'typescript';

export interface TypeServices {
  services: ParserServices | null;
  checker: ts.TypeChecker | null;
  getTSNode: ((node: TSESTree.Node) => ts.Node | undefined) | null;
}

/**
 * Retrieves the TypeScript parser services, type checker, and node mapper
 * from the rule context, falling back gracefully if type information is unavailable.
 */
export function getTypeServices(
  context: TSESLint.RuleContext<string, readonly unknown[]>
): TypeServices {
  let services: ParserServices | null = null;
  let checker: ts.TypeChecker | null = null;

  try {
    services = ESLintUtils.getParserServices(context, true);
    checker = services.program ? services.program.getTypeChecker() : null;
  } catch {
    services = null;
  }

  const getTSNode = services
    ? (node: TSESTree.Node) => services?.esTreeNodeToTSNodeMap.get(node)
    : null;

  return { services, checker, getTSNode };
}
