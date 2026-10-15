/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ASTUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { walkFrom } from './ast';
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

/**
 * Checks whether an `addCommand` receiver is a registry the code created
 * itself with `new CommandRegistry()`, such as the throw-away registry behind
 * a context menu, rather than the application's shared `app.commands`.
 */
export function isPrivateCommandRegistry(
  receiver: TSESTree.Expression,
  scope: TSESLint.Scope.Scope
): boolean {
  const values = getAssignedValues(receiver, scope);
  return (
    values !== null &&
    values.length > 0 &&
    values.every(value => isNewCommandRegistry(value, scope))
  );
}

/**
 * Collects every value assigned to a variable or to a `this.<field>`, or
 * returns null when the receiver is neither.
 */
function getAssignedValues(
  receiver: TSESTree.Expression,
  scope: TSESLint.Scope.Scope
): TSESTree.Node[] | null {
  if (receiver.type === 'Identifier') {
    const variable = ASTUtils.findVariable(scope, receiver);
    if (!variable) {
      return null;
    }
    const values: TSESTree.Node[] = [];
    for (const reference of variable.references) {
      if (reference.isWrite()) {
        // A write without a value (`for (x of ...)`, destructuring) is not
        // a known registry.
        if (!reference.writeExpr) {
          return null;
        }
        values.push(reference.writeExpr);
      }
    }
    return values;
  }

  if (
    receiver.type !== 'MemberExpression' ||
    receiver.computed ||
    receiver.object.type !== 'ThisExpression'
  ) {
    return null;
  }

  const property = receiver.property;
  const classBody = getEnclosingClassBody(receiver);
  if (!classBody) {
    return null;
  }

  const values: TSESTree.Node[] = [];
  let unknownWrite = false;
  walkFrom(classBody, node => {
    if (
      (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
      node.body !== classBody
    ) {
      return 'skip-children';
    }
    if (
      node.type === 'PropertyDefinition' &&
      !node.computed &&
      isSameKey(node.key, property)
    ) {
      if (node.value) {
        values.push(node.value);
      }
      return undefined;
    }
    if (
      node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      node.left.object.type === 'ThisExpression' &&
      !node.left.computed &&
      isSameKey(node.left.property, property)
    ) {
      // In a nested regular function `this` is whatever the caller binds,
      // which may or may not be this instance, so the write is unknown.
      if (node.operator !== '=' || getEnclosingClassBody(node) !== classBody) {
        unknownWrite = true;
        return 'stop';
      }
      values.push(node.right);
    }
    return undefined;
  });
  return unknownWrite ? null : values;
}

/**
 * Finds the class body whose instance `this` refers to at a node, looking
 * through arrow functions.
 */
function getEnclosingClassBody(node: TSESTree.Node): TSESTree.ClassBody | null {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'FunctionExpression' ||
      current.type === 'FunctionDeclaration'
    ) {
      // Only a method keeps the class instance as `this`.
      const owner = current.parent;
      if (
        owner?.type !== 'MethodDefinition' &&
        owner?.type !== 'PropertyDefinition'
      ) {
        return null;
      }
    }
    if (current.type === 'ClassBody') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isSameKey(
  key: TSESTree.Node,
  property: TSESTree.Identifier | TSESTree.PrivateIdentifier
): boolean {
  return key.type === property.type && key.name === property.name;
}

/**
 * Checks for `new CommandRegistry()`, `new <ns>.CommandRegistry()` or a
 * renamed import of `CommandRegistry`.
 */
function isNewCommandRegistry(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope
): boolean {
  while (
    node.type === 'TSAsExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSTypeAssertion'
  ) {
    node = node.expression;
  }
  if (node.type !== 'NewExpression') {
    return false;
  }

  const callee = node.callee;
  if (callee.type === 'MemberExpression') {
    return (
      !callee.computed &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'CommandRegistry'
    );
  }
  if (callee.type !== 'Identifier') {
    return false;
  }
  if (callee.name === 'CommandRegistry') {
    return true;
  }

  const definition = ASTUtils.findVariable(scope, callee)?.defs[0];
  return (
    definition?.node.type === 'ImportSpecifier' &&
    definition.node.imported.type === 'Identifier' &&
    definition.node.imported.name === 'CommandRegistry'
  );
}
