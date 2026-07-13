/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ParserServices } from '@typescript-eslint/utils';
import { visitorKeys, getKeys } from '@typescript-eslint/visitor-keys';
import * as ts from 'typescript';

export type ClassLike = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

export type SignalClassification = 'signal' | 'not-signal' | 'unknown';

type ConnectCallExpression = TSESTree.CallExpression & {
  callee: TSESTree.MemberExpression;
};

type WalkAction = 'skip-children' | 'stop' | undefined;

/**
 * Iterative AST walk from `root`, visiting every node. The visitor may return
 * 'skip-children' to avoid descending into a node, or 'stop' to abort the
 * whole walk.
 */
function walkFrom(
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

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Checks if a call expression is a non-computed `<expr>.<name>(...)` call.
 */
function isMemberCallNamed(
  node: TSESTree.CallExpression,
  names: readonly string[]
): node is ConnectCallExpression {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    names.includes(node.callee.property.name)
  );
}

/**
 * Checks if a node represents `<expr>.connect(...)`.
 */
export function isConnectCall(
  node: TSESTree.CallExpression
): node is ConnectCallExpression {
  return isMemberCallNamed(node, ['connect']);
}

/**
 * Checks if a node represents `<expr>.disconnect(...)` or a call to one of
 * the additional cleanup method names.
 */
export function isDisconnectCall(
  node: TSESTree.CallExpression,
  extraMethodNames: readonly string[] = []
): boolean {
  return isMemberCallNamed(node, ['disconnect', ...extraMethodNames]);
}

/**
 * Checks if a node represents `this.dispose()`.
 */
export function isThisDisposeCall(node: TSESTree.CallExpression): boolean {
  return (
    isMemberCallNamed(node, ['dispose']) &&
    (node.callee as TSESTree.MemberExpression).object.type === 'ThisExpression'
  );
}

/**
 * Checks if a node represents `<expr>.disposed.connect(...)` — disposal
 * cleanup wired through a `disposed`-style signal.
 */
export function isDisposedSignalWiring(node: TSESTree.CallExpression): boolean {
  if (!isConnectCall(node)) {
    return false;
  }
  const object = node.callee.object;
  return (
    object.type === 'MemberExpression' &&
    !object.computed &&
    object.property.type === 'Identifier' &&
    object.property.name === 'disposed'
  );
}

/**
 * Checks if the return value of a `.connect(...)` call is consumed (assigned,
 * passed as an argument, etc.) rather than discarded as a bare statement.
 */
export function isConnectReturnValueConsumed(
  node: TSESTree.CallExpression
): boolean {
  let parent = node.parent;
  if (parent?.type === 'ChainExpression') {
    parent = parent.parent;
  }
  return parent !== undefined && parent.type !== 'ExpressionStatement';
}

const SIGNAL_CLEANUP_STATICS = [
  'clearData',
  'disconnectAll',
  'disconnectReceiver',
  'disconnectSender',
  'disconnectBetween'
];

/**
 * Collects the local names under which the Lumino `Signal` namespace is
 * available in this file. Always includes 'Signal' (ambient/global usage) and
 * adds local aliases from `import { Signal as X } from '@lumino/signaling'`.
 */
export function collectSignalNamespaceLocalNames(
  program: TSESTree.Program
): Set<string> {
  const names = new Set(['Signal']);
  for (const statement of program.body) {
    if (
      statement.type === 'ImportDeclaration' &&
      statement.source.value === '@lumino/signaling'
    ) {
      for (const specifier of statement.specifiers) {
        if (
          specifier.type === 'ImportSpecifier' &&
          specifier.imported.type === 'Identifier' &&
          specifier.imported.name === 'Signal'
        ) {
          names.add(specifier.local.name);
        }
      }
    }
  }
  return names;
}

/**
 * Checks if a node represents `Signal.clearData(...)` or one of the other
 * static disconnect helpers on the `Signal` namespace (under any local name).
 */
export function isSignalNamespaceCleanupCall(
  node: TSESTree.CallExpression,
  signalLocalNames: ReadonlySet<string>
): boolean {
  return (
    isMemberCallNamed(node, SIGNAL_CLEANUP_STATICS) &&
    (node.callee as TSESTree.MemberExpression).object.type === 'Identifier' &&
    signalLocalNames.has(
      ((node.callee as TSESTree.MemberExpression).object as TSESTree.Identifier)
        .name
    )
  );
}

/**
 * Returns the innermost class enclosing `node`, or null if the node is not
 * inside a class body.
 */
export function getEnclosingClass(node: TSESTree.Node): ClassLike | null {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'ClassDeclaration' ||
      current.type === 'ClassExpression'
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Determines whether `node` sits in a static class context by reading the
 * `static` flag of the nearest enclosing class member (or static block).
 */
export function isStaticContext(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === 'StaticBlock') {
      return true;
    }
    if (
      current.type === 'MethodDefinition' ||
      current.type === 'PropertyDefinition'
    ) {
      return current.static;
    }
    if (current.type === 'ClassBody') {
      return false;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Finds the class member named `name` in the class body, matching privacy
 * (`this.#name` vs `this.name`) and staticness. Names are compared without
 * the `#` prefix.
 */
export function resolveClassMember(
  classNode: ClassLike,
  name: string,
  opts: { isPrivate: boolean; isStatic: boolean }
): TSESTree.MethodDefinition | TSESTree.PropertyDefinition | null {
  for (const member of classNode.body.body) {
    if (
      member.type !== 'MethodDefinition' &&
      member.type !== 'PropertyDefinition'
    ) {
      continue;
    }
    if (member.static !== opts.isStatic || member.computed) {
      continue;
    }
    const key = member.key;
    if (opts.isPrivate) {
      if (key.type === 'PrivateIdentifier' && key.name === name) {
        return member;
      }
    } else if (
      (key.type === 'Identifier' && key.name === name) ||
      (key.type === 'Literal' && key.value === name)
    ) {
      return member;
    }
  }
  return null;
}

/**
 * Scans an entire class body for any evidence that signal connections are
 * cleaned up somewhere: `Signal.clearData(...)`-style static cleanup calls,
 * `.disconnect(...)` calls (or configured additional cleanup methods),
 * `this.dispose()` calls, `.disposed.connect(...)` wiring, or a `.connect()`
 * whose return value is consumed (e.g. added to a DisposableSet). Nested
 * classes are opaque — their cleanup does not count for the outer class.
 */
export function classHasCleanupEvidence(
  classNode: ClassLike,
  signalLocalNames: ReadonlySet<string>,
  extraMethodNames: readonly string[] = []
): boolean {
  let found = false;
  walkFrom(classNode.body, node => {
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      return 'skip-children';
    }
    if (node.type === 'CallExpression') {
      if (
        isSignalNamespaceCleanupCall(node, signalLocalNames) ||
        isDisconnectCall(node, extraMethodNames) ||
        isThisDisposeCall(node) ||
        isDisposedSignalWiring(node) ||
        (isConnectCall(node) && isConnectReturnValueConsumed(node))
      ) {
        found = true;
        return 'stop';
      }
    }
    return undefined;
  });
  return found;
}

/**
 * Checks whether a function body references `this` in its own binding.
 * Descends into arrow functions (lexically transparent) but not into nested
 * regular functions, static blocks, or nested classes (own `this` binding).
 */
export function methodUsesThis(fn: TSESTree.FunctionExpression): boolean {
  let found = false;
  walkFrom(fn.body, node => {
    if (
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration' ||
      node.type === 'TSDeclareFunction' ||
      node.type === 'StaticBlock' ||
      node.type === 'ClassDeclaration' ||
      node.type === 'ClassExpression'
    ) {
      return 'skip-children';
    }
    if (node.type === 'ThisExpression') {
      found = true;
      return 'stop';
    }
    return undefined;
  });
  return found;
}

/**
 * Syntactic hint that an expression is likely a Lumino signal, based on
 * conventional signal naming (`stateChanged`, `disposed`, `somethingSignal`).
 */
export function looksLikeSignalByName(
  objectNode: TSESTree.Expression
): boolean {
  let name: string | null = null;
  if (objectNode.type === 'Identifier') {
    name = objectNode.name;
  } else if (
    objectNode.type === 'MemberExpression' &&
    !objectNode.computed &&
    objectNode.property.type === 'Identifier'
  ) {
    name = objectNode.property.name;
  }
  return name !== null && /(signal|changed|disposed)$/i.test(name);
}

/**
 * Classifies the static type of a `.connect()` receiver expression:
 * - 'signal': resolves to Lumino `ISignal`/`Signal` (by symbol name or a
 *   declaration living in `@lumino/signaling`)
 * - 'not-signal': resolves to some other concrete type
 * - 'unknown': no type information, `any`/`unknown`, or resolution failure
 */
export function classifySignalReceiver(
  objectNode: TSESTree.Expression,
  checker: ts.TypeChecker | null,
  services: ParserServices | null
): SignalClassification {
  if (!checker || !services || !services.esTreeNodeToTSNodeMap) {
    return 'unknown';
  }
  try {
    const tsNode = services.esTreeNodeToTSNodeMap.get(objectNode);
    if (!tsNode) {
      return 'unknown';
    }
    return classifyTsType(checker.getTypeAtLocation(tsNode), checker);
  } catch {
    return 'unknown';
  }
}

function classifyTsType(
  type: ts.Type,
  checker: ts.TypeChecker
): SignalClassification {
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return 'unknown';
  }
  if (type.isUnion()) {
    const results = type.types
      .filter(t => !(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)))
      .map(t => classifyTsType(t, checker));
    if (results.includes('signal')) {
      return 'signal';
    }
    if (results.length > 0 && results.every(r => r === 'not-signal')) {
      return 'not-signal';
    }
    return 'unknown';
  }
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (!symbol) {
    return 'unknown';
  }
  const name = symbol.getName();
  if (name === 'ISignal' || name === 'Signal') {
    return 'signal';
  }
  for (const declaration of symbol.getDeclarations() ?? []) {
    const fileName = declaration.getSourceFile().fileName;
    if (
      fileName.includes('lumino/signaling') ||
      fileName.includes('lumino\\signaling')
    ) {
      return 'signal';
    }
  }
  return 'not-signal';
}
