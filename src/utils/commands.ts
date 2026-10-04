/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ASTUtils, TSESLint } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { resolveStaticString } from './plugin-utils';

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

/**
 * Resolves a command ID expression to the string it holds at lint time.
 *
 * On top of `resolveStaticString`, this reads a member of a namespace or enum
 * declared in the same file without type information, since
 * `namespace CommandIDs { export const open = '...'; }` is how JupyterLab and
 * most extensions declare their command IDs.
 */
export function resolveCommandId(
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): string | null {
  const scope = sourceCode.getScope(node);
  const resolved = resolveStaticString(node, scope, checker, getTSNode);
  if (resolved !== null) {
    return resolved;
  }

  if (
    node.type !== 'MemberExpression' ||
    node.computed ||
    node.object.type !== 'Identifier' ||
    node.property.type !== 'Identifier'
  ) {
    return null;
  }

  const variable = ASTUtils.findVariable(scope, node.object);
  if (!variable) {
    return null;
  }

  const memberName = node.property.name;
  // Namespaces and enums can be declared in several merged blocks.
  for (const def of variable.defs) {
    const initializer = findDeclaredMember(def.node, memberName);
    if (initializer) {
      return resolveStaticString(
        initializer,
        sourceCode.getScope(initializer),
        checker,
        getTSNode
      );
    }
  }
  return null;
}

/**
 * Finds the initializer of an exported `const` in a namespace block, or of a
 * member of an enum.
 */
function findDeclaredMember(
  declaration: TSESTree.Node,
  memberName: string
): TSESTree.Expression | null {
  if (declaration.type === 'TSEnumDeclaration') {
    for (const member of declaration.body.members) {
      const key =
        member.id.type === 'Identifier' ? member.id.name : member.id.value;
      if (key === memberName) {
        return member.initializer ?? null;
      }
    }
    return null;
  }

  if (
    declaration.type !== 'TSModuleDeclaration' ||
    declaration.body?.type !== 'TSModuleBlock'
  ) {
    return null;
  }

  for (const statement of declaration.body.body) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'VariableDeclaration' ||
      statement.declaration.kind !== 'const'
    ) {
      continue;
    }
    for (const declarator of statement.declaration.declarations) {
      if (
        declarator.id.type === 'Identifier' &&
        declarator.id.name === memberName
      ) {
        return declarator.init;
      }
    }
  }
  return null;
}
