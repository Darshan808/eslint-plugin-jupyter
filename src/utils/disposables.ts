/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ParserServices, TSESLint } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { getJupyterPluginKind } from './plugin-utils';

const DISPOSABLE_INTERFACE_NAMES = ['IDisposable', 'IObservableDisposable'];

const DISPOSABLE_CONSTRUCTOR_NAMES = [
  'DisposableDelegate',
  'ObservableDisposableDelegate',
  'DisposableSet',
  'ObservableDisposableSet'
];

const DISPOSABLE_SET_NAMES = ['DisposableSet', 'ObservableDisposableSet'];

const OWNED_CONSTRUCTOR_OPTION_NAMES = new Map([
  ['CodeCell', ['model']],
  ['CodeEditorWrapper', ['model']],
  ['CodeViewerWidget', ['model']],
  ['Collapser', ['widget']],
  ['DocumentWidget', ['content']],
  ['FileBrowser', ['model']],
  ['FileEditorWidget', ['content']],
  ['Dialog', ['body']],
  ['Licenses', ['model']],
  ['MainAreaWidget', ['content']],
  ['MarkdownDocument', ['content']],
  ['MarkdownViewer', ['renderer']],
  ['MimeContent', ['renderer']],
  ['MimeDocument', ['content']],
  ['NotebookPanel', ['content']],
  ['RawCell', ['model']]
]);

const OWNED_FUNCTION_OPTION_NAMES = new Map([
  ['createNew', ['sharedModel']],
  ['createNotebook', ['kernelHistory']],
  ['open', ['editorWrapper']],
  ['showPopup', ['body']]
]);

const FLUENT_DISPOSABLE_METHOD_NAMES = ['initializeState'];

/**
 * Resolves a configurable name list option.
 *
 * A user-supplied list is *added* to the built-in defaults, so a project only
 * has to name its own helpers rather than restate this plugin's list. Passing
 * the matching `extendDefault...` option as `false` drops the defaults, whether
 * or not a replacement list is given, which is also how to ask for the
 * strictest possible checking.
 */
export function resolveNameListOption(
  provided: readonly string[] | undefined,
  defaults: readonly string[],
  extendDefaults: boolean
): Set<string> {
  const names = extendDefaults ? [...defaults] : [];
  if (provided) {
    names.push(...provided);
  }
  return new Set(names);
}

export const DEFAULT_OWNERSHIP_FUNCTION_NAMES = [
  'add',
  'addCell',
  'addFactory',
  'addGroup',
  'addItem',
  'addMenu',
  'addModelFactory',
  'addSibling',
  'addWidget',
  'addWidgetFactory',
  'insertBefore',
  'insertItem',
  'insertWidget',
  'registerStatusItem',
  '_wrappedOutput'
];

interface PendingDisposable {
  node: TSESTree.Node;
}

export interface DisposableOwnershipContext {
  sourceCode: TSESLint.SourceCode;
  checker: ts.TypeChecker | null;
  services: ParserServices | null;
  ownershipFunctionNames: Set<string>;
}

export type PendingDisposableMap = Map<
  TSESLint.Scope.Variable,
  PendingDisposable[]
>;

function getStaticMemberName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }
  return null;
}

export function getCalleeName(node: TSESTree.Node): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression') {
    return getStaticMemberName(node);
  }
  return null;
}

function getTransparentChild(node: TSESTree.Node): TSESTree.Node | null {
  if (
    node.type === 'ChainExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSNonNullExpression'
  ) {
    return node.expression;
  }
  return null;
}

function reducerReturnsAccumulator(
  callback: TSESTree.Node,
  accumulatorName: string
): boolean {
  if (
    callback.type !== 'ArrowFunctionExpression' &&
    callback.type !== 'FunctionExpression'
  ) {
    return false;
  }

  if (
    callback.body.type === 'Identifier' &&
    callback.body.name === accumulatorName
  ) {
    return true;
  }

  return (
    callback.body.type === 'BlockStatement' &&
    callback.body.body.some(
      statement =>
        statement.type === 'ReturnStatement' &&
        statement.argument?.type === 'Identifier' &&
        statement.argument.name === accumulatorName
    )
  );
}

function isReduceAccumulatorInitialValue(
  node: TSESTree.Node,
  parent: TSESTree.Node
): parent is TSESTree.CallExpression {
  if (
    parent.type !== 'CallExpression' ||
    parent.callee.type !== 'MemberExpression' ||
    getStaticMemberName(parent.callee) !== 'reduce' ||
    parent.arguments.length < 2 ||
    parent.arguments[1] !== node
  ) {
    return false;
  }

  const [callback] = parent.arguments;
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' &&
      callback.type !== 'FunctionExpression')
  ) {
    return false;
  }

  const [accumulator] = callback.params;
  return (
    accumulator?.type === 'Identifier' &&
    reducerReturnsAccumulator(callback, accumulator.name)
  );
}

function getOuterExpression(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  let parent = current.parent;
  while (parent) {
    const child = getTransparentChild(parent);
    if (child === current) {
      current = parent;
      parent = current.parent;
      continue;
    }

    if (isReduceAccumulatorInitialValue(current, parent)) {
      current = parent;
      parent = current.parent;
      continue;
    }

    if (
      parent.type === 'MemberExpression' &&
      parent.object === current &&
      parent.parent?.type === 'CallExpression' &&
      parent.parent.callee === parent &&
      FLUENT_DISPOSABLE_METHOD_NAMES.includes(getStaticMemberName(parent) ?? '')
    ) {
      current = parent.parent;
      parent = current.parent;
      continue;
    }

    break;
  }
  return current;
}

function isThisMemberExpression(node: TSESTree.Node): boolean {
  const expression = getOuterExpression(node);
  if (expression.type === 'ThisExpression') {
    return true;
  }
  if (expression.type !== 'MemberExpression') {
    return false;
  }
  return isThisMemberExpression(expression.object);
}

function getOuterFallbackExpression(node: TSESTree.Node): TSESTree.Node {
  let current = getOuterExpression(node);
  let parent = current.parent;
  while (
    parent &&
    ((parent.type === 'LogicalExpression' &&
      (parent.operator === '||' || parent.operator === '??') &&
      (parent.left === current || parent.right === current)) ||
      (parent.type === 'ConditionalExpression' &&
        (parent.consequent === current || parent.alternate === current)))
  ) {
    current = parent;
    parent = current.parent;
  }
  return current;
}

function isStaticMemberCall(
  node: TSESTree.CallExpression,
  name: string
): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    getStaticMemberName(node.callee) === name
  );
}

function isOwnershipFunctionCall(
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): boolean {
  const name = getCalleeName(node.callee);
  return name !== null && ownership.ownershipFunctionNames.has(name);
}

function getReceiverName(node: TSESTree.Node): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name;
  }
  return null;
}

function isLikelyDisposableSet(node: TSESTree.Node): boolean {
  const name = getReceiverName(node);
  return name === 'disposables' || name === '_disposables';
}

function isLikelyDisposableProperty(node: TSESTree.Node): boolean {
  const name = getReceiverName(node);
  return name === 'disposablesProperty';
}

export function isDisposableConstructor(node: TSESTree.NewExpression): boolean {
  const name = getCalleeName(node.callee);
  return name !== null && DISPOSABLE_CONSTRUCTOR_NAMES.includes(name);
}

function isDisposableSetConstructor(node: TSESTree.NewExpression): boolean {
  const name = getCalleeName(node.callee);
  return name !== null && DISPOSABLE_SET_NAMES.includes(name);
}

export function isDisposableSetFactoryCall(node: TSESTree.Node): boolean {
  if (
    node.type !== 'CallExpression' ||
    node.callee.type !== 'MemberExpression' ||
    getStaticMemberName(node.callee) !== 'from'
  ) {
    return false;
  }

  const name = getCalleeName(node.callee.object);
  return name !== null && DISPOSABLE_SET_NAMES.includes(name);
}

function isDirectArrayArgument(
  element: TSESTree.ArrayExpression['elements'][number]
): element is TSESTree.Expression {
  return element !== null && element.type !== 'SpreadElement';
}

function getDisposableSetFactoryArguments(
  node: TSESTree.CallExpression
): TSESTree.CallExpressionArgument[] {
  if (!isDisposableSetFactoryCall(node)) {
    return [];
  }

  const [items] = node.arguments;
  if (!items || items.type !== 'ArrayExpression') {
    return [];
  }

  return items.elements.filter(isDirectArrayArgument);
}

function resolveVariable(
  sourceCode: TSESLint.SourceCode,
  identifier: TSESTree.Identifier
): TSESLint.Scope.Variable | null {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
  while (scope) {
    const variable = scope.set.get(identifier.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

function getIdentifierVariable(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node | null | undefined
): TSESLint.Scope.Variable | null {
  if (!node) {
    return null;
  }
  if (node.type === 'Identifier') {
    return resolveVariable(sourceCode, node);
  }
  const child = getTransparentChild(node);
  if (child) {
    return getIdentifierVariable(sourceCode, child);
  }
  return null;
}

function getVariableInitializer(
  variable: TSESLint.Scope.Variable
): TSESTree.Node | null {
  for (const definition of variable.defs) {
    const node = definition.node;
    if (node.type === 'VariableDeclarator') {
      return node.init ?? null;
    }
  }
  return null;
}

function getIdentifierVariables(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node | null | undefined,
  seen = new Set<TSESLint.Scope.Variable>()
): TSESLint.Scope.Variable[] {
  const variable = getIdentifierVariable(sourceCode, node);
  if (variable) {
    if (seen.has(variable)) {
      return [variable];
    }
    seen.add(variable);
    const initializer = getVariableInitializer(variable);
    if (
      initializer?.type === 'ArrayExpression' ||
      initializer?.type === 'ObjectExpression'
    ) {
      return [
        variable,
        ...getIdentifierVariables(sourceCode, initializer, seen)
      ];
    }
    return [variable];
  }
  if (!node) {
    return [];
  }

  const child = getTransparentChild(node);
  if (child) {
    return getIdentifierVariables(sourceCode, child, seen);
  }

  if (node.type === 'ArrayExpression') {
    return node.elements.flatMap(element =>
      element && element.type !== 'SpreadElement'
        ? getIdentifierVariables(sourceCode, element, seen)
        : []
    );
  }

  if (node.type === 'ObjectExpression') {
    return node.properties.flatMap(property =>
      property.type === 'Property'
        ? getIdentifierVariables(sourceCode, property.value, seen)
        : []
    );
  }

  return [];
}

export function addPendingDisposable(
  pending: PendingDisposableMap,
  variable: TSESLint.Scope.Variable,
  node: TSESTree.Node
): void {
  const records = pending.get(variable) ?? [];
  records.push({ node });
  pending.set(variable, records);
}

function markDisposableManaged(
  pending: PendingDisposableMap,
  variable: TSESLint.Scope.Variable | null,
  useNode?: TSESTree.Node
): void {
  if (!variable) {
    return;
  }
  const records = pending.get(variable);
  if (!records) {
    return;
  }

  if (useNode && shouldMarkAllBranchRecords(records, useNode)) {
    pending.delete(variable);
    return;
  }

  records.pop();
  if (records.length === 0) {
    pending.delete(variable);
  }
}

function hasPendingDisposableSet(
  pending: PendingDisposableMap,
  variable: TSESLint.Scope.Variable
): boolean {
  return (
    pending.get(variable)?.some(record => {
      const node = record.node;
      return (
        (node.type === 'NewExpression' && isDisposableSetConstructor(node)) ||
        isDisposableSetFactoryCall(node)
      );
    }) ?? false
  );
}

export function getAssignedVariable(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
): TSESLint.Scope.Variable | null {
  const expression = getOuterFallbackExpression(node);
  const parent = expression.parent;
  if (!parent) {
    return null;
  }
  if (
    parent.type === 'VariableDeclarator' &&
    parent.init === expression &&
    parent.id.type === 'Identifier'
  ) {
    const declaredVariables = sourceCode.getDeclaredVariables(parent);
    return declaredVariables[0] ?? null;
  }
  if (
    parent.type === 'AssignmentExpression' &&
    parent.right === expression &&
    parent.left.type === 'Identifier'
  ) {
    return resolveVariable(sourceCode, parent.left);
  }
  return null;
}

function isFunctionLike(
  node: TSESTree.Node
): node is
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  );
}

function getEnclosingFunction(
  node: TSESTree.Node
):
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | null {
  let parent = node.parent;
  while (parent) {
    if (isFunctionLike(parent)) {
      return parent;
    }
    parent = parent.parent;
  }
  return null;
}

function isConditionalOrRepeated(node: TSESTree.Node): boolean {
  return (
    node.type === 'CatchClause' ||
    node.type === 'ConditionalExpression' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'ForInStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'ForStatement' ||
    node.type === 'IfStatement' ||
    node.type === 'SwitchCase' ||
    node.type === 'SwitchStatement' ||
    node.type === 'TryStatement' ||
    node.type === 'WhileStatement'
  );
}

function isBeforeNode(first: TSESTree.Node, second: TSESTree.Node): boolean {
  if (first.range && second.range) {
    return first.range[1] <= second.range[0];
  }
  return first.loc.end.line <= second.loc.start.line;
}

function getExclusiveBranchAncestor(node: TSESTree.Node): TSESTree.Node | null {
  let current = node;
  let parent = current.parent;

  while (parent) {
    if (isFunctionLike(parent)) {
      return null;
    }

    if (
      parent.type === 'IfStatement' &&
      (parent.consequent === current || parent.alternate === current)
    ) {
      return parent;
    }

    if (
      parent.type === 'SwitchStatement' &&
      current.type === 'SwitchCase' &&
      parent.cases.includes(current)
    ) {
      return parent;
    }

    if (
      parent.type === 'ConditionalExpression' &&
      (parent.consequent === current || parent.alternate === current)
    ) {
      return parent;
    }

    current = parent;
    parent = current.parent;
  }

  return null;
}

function shouldMarkAllBranchRecords(
  records: PendingDisposable[],
  useNode: TSESTree.Node
): boolean {
  if (records.length <= 1) {
    return false;
  }

  const branch = getExclusiveBranchAncestor(records[0].node);
  return (
    branch !== null &&
    isBeforeNode(branch, useNode) &&
    records.every(record => getExclusiveBranchAncestor(record.node) === branch)
  );
}

function isUnconditionalUse(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable
): boolean {
  const scopeBlock = variable.scope.block;
  let parent = node.parent;

  while (parent) {
    if (parent === scopeBlock) {
      return true;
    }
    if (isFunctionLike(parent) || isConditionalOrRepeated(parent)) {
      return false;
    }
    parent = parent.parent;
  }

  return false;
}

function isTruthyIdentifierTest(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode
): boolean {
  const identifier = getIdentifierVariable(sourceCode, node);
  if (identifier === variable) {
    return true;
  }

  if (
    node.type === 'UnaryExpression' &&
    node.operator === '!' &&
    node.argument.type === 'UnaryExpression' &&
    node.argument.operator === '!'
  ) {
    return isTruthyIdentifierTest(node.argument.argument, variable, sourceCode);
  }

  if (node.type === 'LogicalExpression' && node.operator === '&&') {
    return (
      isTruthyIdentifierTest(node.left, variable, sourceCode) ||
      isTruthyIdentifierTest(node.right, variable, sourceCode)
    );
  }

  return false;
}

function isTruthyGuardedUse(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode
): boolean {
  let current = node;
  let parent = current.parent;

  while (parent) {
    if (isFunctionLike(parent)) {
      return false;
    }

    if (
      parent.type === 'IfStatement' &&
      parent.consequent === current &&
      isTruthyIdentifierTest(parent.test, variable, sourceCode)
    ) {
      return true;
    }

    current = parent;
    parent = current.parent;
  }

  return false;
}

function isManagedUse(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode
): boolean {
  return (
    isUnconditionalUse(node, variable) ||
    isTruthyGuardedUse(node, variable, sourceCode)
  );
}

function isCatchClauseUse(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable
): boolean {
  const scopeBlock = variable.scope.block;
  let parent = node.parent;

  while (parent) {
    if (parent === scopeBlock) {
      return false;
    }
    if (parent.type === 'CatchClause') {
      return true;
    }
    parent = parent.parent;
  }

  return false;
}

function getFunctionScope(
  scope: TSESLint.Scope.Scope | null
): TSESLint.Scope.Scope | null {
  let current = scope;
  while (current) {
    if (
      current.type === 'function' ||
      current.type === 'module' ||
      current.type === 'global'
    ) {
      return current;
    }
    current = current.upper;
  }
  return null;
}

export function isOuterFunctionScopeVariable(
  node: TSESTree.Node,
  variable: TSESLint.Scope.Variable,
  sourceCode: TSESLint.SourceCode
): boolean {
  return (
    getFunctionScope(sourceCode.getScope(node)) !==
    getFunctionScope(variable.scope)
  );
}

/**
 * Checks whether the `export` keyword sits on a variable's own declaration, as
 * in `export const tracker = ...`, including inside an exported `namespace`.
 */
function isExportedAtDeclaration(variable: TSESLint.Scope.Variable): boolean {
  return variable.defs.some(definition => {
    let current: TSESTree.Node | undefined = definition.node;
    while (current) {
      if (
        current.type === 'ExportNamedDeclaration' ||
        current.type === 'ExportDefaultDeclaration'
      ) {
        return true;
      }
      // Stop at the declaration boundary: only the declaration itself and its
      // enclosing statement can carry the `export` keyword.
      if (
        current.type === 'VariableDeclaration' &&
        current.parent?.type !== 'ExportNamedDeclaration'
      ) {
        return false;
      }
      current = current.parent;
    }
    return false;
  });
}

/**
 * Checks whether a variable is exported by a later statement rather than at its
 * declaration: `export { tracker }`, `export { tracker as t }`, or
 * `export default tracker`. The scope manager records each of these as a
 * reference to the local binding, so they are matched by resolution rather than
 * by name.
 */
function isExportedByExportStatement(
  variable: TSESLint.Scope.Variable
): boolean {
  return variable.references.some(reference => {
    const parent = reference.identifier.parent;
    return (
      parent?.type === 'ExportSpecifier' ||
      parent?.type === 'ExportDefaultDeclaration'
    );
  });
}

/**
 * Checks whether a variable is an exported binding, in any of the forms the
 * `export` keyword can take.
 *
 * Ownership of an exported singleton passes to the importers of the module, so
 * this file cannot see - and is not responsible for - its disposal. Such
 * declarations are also created exactly once and live for the lifetime of the
 * program, so there is nothing to leak.
 */
export function isExportedVariable(variable: TSESLint.Scope.Variable): boolean {
  if (
    !isExportedAtDeclaration(variable) &&
    !isExportedByExportStatement(variable)
  ) {
    return false;
  }

  // A reassigned export is not a single module-lifetime singleton: every value
  // but the last one is replaced, and only the last one can still be disposed.
  return (
    variable.references.filter(reference => reference.isWrite()).length <= 1
  );
}

/**
 * Checks whether a node is reached on every run of its enclosing function, that
 * is, whether nothing conditional or repeated sits between it and the function
 * body. This is the same standard `isUnconditionalUse` applies within a scope.
 */
function isUnconditionalWithinFunction(node: TSESTree.Node): boolean {
  let parent = node.parent;
  while (parent && !isFunctionLike(parent)) {
    if (isConditionalOrRepeated(parent)) {
      return false;
    }
    parent = parent.parent;
  }
  return true;
}

/**
 * Checks whether a function expression ends up somewhere that can run it later:
 * passed to a call, returned, stored on a field or in an object literal, or
 * assigned to a variable that itself escapes.
 *
 * A callback that is only declared and never used is not a cleanup path, so
 * `const cleanupLater = () => d.dispose();` on its own leaves `d` unmanaged.
 */
function isEscapingCallback(
  fn: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
): boolean {
  const expression = getOuterExpression(fn);
  const parent = expression.parent;
  if (!parent) {
    return false;
  }

  if (parent.type === 'VariableDeclarator' && parent.init === expression) {
    const [variable] = sourceCode.getDeclaredVariables(parent);
    return (
      variable !== undefined &&
      variable.references.some(
        reference => !reference.init && isEscapingUse(reference.identifier)
      )
    );
  }

  return isEscapingUse(expression);
}

/**
 * Positions in which a value is handed to something else: an argument or callee
 * of a call, a return value, a field or object literal entry, an array element.
 */
function isEscapingUse(node: TSESTree.Node): boolean {
  const parent = getOuterExpression(node).parent;
  if (!parent) {
    return false;
  }
  return (
    parent.type === 'CallExpression' ||
    parent.type === 'NewExpression' ||
    parent.type === 'ReturnStatement' ||
    parent.type === 'PropertyDefinition' ||
    parent.type === 'Property' ||
    parent.type === 'ArrayExpression' ||
    (parent.type === 'ArrowFunctionExpression' && parent.body === node) ||
    (parent.type === 'AssignmentExpression' &&
      parent.left.type === 'MemberExpression')
  );
}

/**
 * Checks whether a reference sits inside a closure that the declaring function
 * unconditionally returns, the factory pattern:
 *
 * ```ts
 * function createToolbarFactory() {
 *   const items = new ObservableList(...);
 *   return (widget: Widget) => { ...uses items... };
 * }
 * ```
 *
 * The closure is the function's product, so the captured state's lifetime is
 * bound to it and belongs to whoever holds the factory. Walks outwards through
 * enclosing functions, because the reference is often nested deeper than the
 * returned closure itself (in a handler declared inside it).
 *
 * Only an unconditional `return` counts, matching how ownership transfer is
 * treated elsewhere in this file. A closure that merely escapes as a call
 * argument does not count: that is `defer(() => console.log(d))`, which hands
 * off nothing.
 */
function isCapturedByReturnedClosure(
  identifier: TSESTree.Node,
  variable: TSESLint.Scope.Variable
): boolean {
  const declaringFunction = getFunctionScope(variable.scope)?.block;
  if (!declaringFunction) {
    return false;
  }

  let fn = getEnclosingFunction(identifier);
  while (fn && fn !== declaringFunction) {
    const expression = getOuterExpression(fn);
    const parent = expression.parent;

    const returnedFromDeclaringFunction =
      parent?.type === 'ReturnStatement' &&
      parent.argument === expression &&
      getEnclosingFunction(parent) === declaringFunction &&
      isUnconditionalWithinFunction(parent);

    // `const make = () => () => items.use()` returns implicitly.
    const isImplicitReturnBody =
      parent?.type === 'ArrowFunctionExpression' &&
      parent.body === expression &&
      parent === declaringFunction;

    if (returnedFromDeclaringFunction || isImplicitReturnBody) {
      return true;
    }

    fn = getEnclosingFunction(fn);
  }

  return false;
}

/**
 * Checks whether this exact reference is handed to an ownership call, following
 * only value-preserving positions on the way out: `set.add(item)`,
 * `set.add([item])`, `set.add({ item })`, `set.add(item as IDisposable)`.
 *
 * Anchored on the resolved reference rather than on its name, so a same-named
 * binding elsewhere in the callback cannot be mistaken for this variable. The
 * transfer must also be unconditional, matching how same-scope transfers are
 * treated: a transfer that only happens on some paths is not a transfer.
 */
function isReferenceHandedToOwnershipCall(
  identifier: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  let current: TSESTree.Node = identifier;
  let parent = current.parent;

  while (parent && !isFunctionLike(parent)) {
    if (parent.type === 'CallExpression') {
      return (
        getOwnershipArguments(parent, ownership).includes(
          current as TSESTree.CallExpressionArgument
        ) && isUnconditionalWithinFunction(parent)
      );
    }

    const preservesValue =
      getTransparentChild(parent) === current ||
      (parent.type === 'ArrayExpression' &&
        parent.elements.includes(current as TSESTree.Expression)) ||
      (parent.type === 'Property' && parent.value === current) ||
      (parent.type === 'ObjectExpression' &&
        parent.properties.includes(current as TSESTree.Property));
    if (!preservesValue) {
      return false;
    }

    current = parent;
    parent = current.parent;
  }

  return false;
}

/**
 * Checks whether a variable's lifetime is taken over by a nested function, in
 * any of three ways:
 *
 * - it is captured by a closure the declaring function returns, so the closure
 *   owns it (`createToolbarFactory`);
 * - an escaping callback unconditionally disposes it
 *   (`requestAnimationFrame(() => splash.dispose())`, promise chains);
 * - an escaping callback unconditionally hands its ownership to something else.
 *
 * The last two generalise the existing `disposed.connect(...)` special case to
 * any callback. Cleanup that is itself conditional inside the callback does not
 * count, so "cleanup only on some paths" stays reportable, and every branch
 * resolves identifiers to this variable rather than comparing names, so a
 * shadowing binding inside the callback cannot silence the outer one.
 */
export function isDisposedByNestedFunction(
  variable: TSESLint.Scope.Variable,
  ownership: DisposableOwnershipContext
): boolean {
  const declaringScope = getFunctionScope(variable.scope);

  for (const reference of variable.references) {
    if (getFunctionScope(reference.from) === declaringScope) {
      continue;
    }

    if (isCapturedByReturnedClosure(reference.identifier, variable)) {
      return true;
    }

    const fn = getEnclosingFunction(reference.identifier);
    if (
      !fn ||
      (fn.type !== 'ArrowFunctionExpression' &&
        fn.type !== 'FunctionExpression')
    ) {
      continue;
    }

    // A callback nobody can run is not a cleanup path.
    if (!isEscapingCallback(fn, ownership.sourceCode)) {
      continue;
    }

    if (isReferenceHandedToOwnershipCall(reference.identifier, ownership)) {
      return true;
    }

    const disposesVariable = getUnconditionalDisposeTargets(fn).some(
      target => getIdentifierVariable(ownership.sourceCode, target) === variable
    );
    if (disposesVariable) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an object literal is shaped like a Jupyter plugin descriptor,
 * either by its declared type or by its property names.
 */
function isPluginDescriptorObject(
  object: TSESTree.ObjectExpression,
  ownership: DisposableOwnershipContext
): boolean {
  const declarator = object.parent;
  if (
    declarator?.type === 'VariableDeclarator' &&
    getJupyterPluginKind(
      declarator,
      ownership.checker,
      ownership.services
        ? node => ownership.services!.esTreeNodeToTSNodeMap.get(node)
        : null
    ) !== null
  ) {
    return true;
  }

  const propertyNames = new Set(
    object.properties.flatMap(property =>
      property.type === 'Property'
        ? [getPropertyName(property)].filter(
            (name): name is string => name !== null
          )
        : []
    )
  );
  return (
    propertyNames.has('id') &&
    propertyNames.has('activate') &&
    ['autoStart', 'optional', 'provides', 'requires'].some(name =>
      propertyNames.has(name)
    )
  );
}

/**
 * Resolves the variable a function is named by, so its references can be
 * inspected: `function activateCsv() {}` or `const activateCsv = () => {}`.
 */
function getFunctionNameVariable(
  fn: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
): TSESLint.Scope.Variable | null {
  if (fn.type === 'FunctionDeclaration' && fn.id) {
    const name = fn.id.name;
    return (
      sourceCode.getDeclaredVariables(fn).find(entry => entry.name === name) ??
      null
    );
  }

  const declarator = fn.parent;
  if (
    declarator?.type === 'VariableDeclarator' &&
    declarator.init === fn &&
    declarator.id.type === 'Identifier'
  ) {
    return sourceCode.getDeclaredVariables(declarator)[0] ?? null;
  }

  return null;
}

/**
 * Checks whether a function is wired up as the `activate` of a plugin
 * descriptor elsewhere in the file, e.g. `activate: activateCsv`.
 */
function isReferencedAsPluginActivate(
  variable: TSESLint.Scope.Variable,
  ownership: DisposableOwnershipContext
): boolean {
  return variable.references.some(reference => {
    const property = reference.identifier.parent;
    return (
      property?.type === 'Property' &&
      property.value === reference.identifier &&
      getPropertyName(property) === 'activate' &&
      property.parent?.type === 'ObjectExpression' &&
      isPluginDescriptorObject(property.parent, ownership)
    );
  });
}

export function isInJupyterPluginActivate(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  const fn = getEnclosingFunction(node);
  if (!fn) {
    return false;
  }

  // Inline form: `const plugin = { id, autoStart, activate: () => { ... } }`.
  const property = fn.parent;
  if (
    property?.type === 'Property' &&
    property.value === fn &&
    getPropertyName(property) === 'activate' &&
    property.parent?.type === 'ObjectExpression' &&
    isPluginDescriptorObject(property.parent, ownership)
  ) {
    return true;
  }

  // Named form: `function activate() { ... }`, the convention for plugins whose
  // activation lives in a separate function (often in a `Private` namespace).
  if (fn.type === 'FunctionDeclaration' && fn.id?.name === 'activate') {
    return true;
  }

  // Referenced form: `function activateCsv() { ... }` used as
  // `{ id, autoStart, activate: activateCsv }`.
  const nameVariable = getFunctionNameVariable(fn, ownership.sourceCode);
  return (
    nameVariable !== null &&
    isReferencedAsPluginActivate(nameVariable, ownership)
  );
}

function hasTypeName(
  type: ts.Type,
  checker: ts.TypeChecker,
  names: readonly string[]
): boolean {
  const apparentType = checker.getApparentType(type);
  const symbols = [
    type.aliasSymbol,
    type.getSymbol(),
    apparentType.aliasSymbol,
    apparentType.getSymbol()
  ];

  return symbols.some(symbol => {
    if (!symbol) {
      return false;
    }
    return names.includes(symbol.getName());
  });
}

function isDisposableSetType(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  return hasExpressionTypeName(node, ownership, DISPOSABLE_SET_NAMES);
}

function hasExpressionTypeName(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext,
  names: readonly string[]
): boolean {
  if (!ownership.checker || !ownership.services) {
    return false;
  }

  try {
    const tsNode = ownership.services.esTreeNodeToTSNodeMap.get(node);
    const type = ownership.checker.getTypeAtLocation(tsNode);
    return hasTypeName(type, ownership.checker, names);
  } catch {
    return false;
  }
}

function declarationHasHeritageName(
  declaration: ts.Declaration,
  names: readonly string[]
): boolean {
  if (
    !(
      ts.isClassDeclaration(declaration) ||
      ts.isClassExpression(declaration) ||
      ts.isInterfaceDeclaration(declaration)
    )
  ) {
    return false;
  }

  return (
    declaration.heritageClauses?.some(clause =>
      clause.types.some(type => {
        const text = type.expression.getText();
        return names.some(name => text === name || text.endsWith(`.${name}`));
      })
    ) ?? false
  );
}

function hasHeritageName(
  type: ts.Type,
  names: readonly string[],
  seen = new Set<ts.Type>()
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);

  if (type.isUnion()) {
    return type.types.some(part => hasHeritageName(part, names, seen));
  }

  if (type.isIntersection()) {
    return type.types.some(part => hasHeritageName(part, names, seen));
  }

  const symbol = type.getSymbol();
  return (
    symbol?.declarations?.some(declaration =>
      declarationHasHeritageName(declaration, names)
    ) ?? false
  );
}

function hasExpressionTypeOrHeritageName(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext,
  names: readonly string[]
): boolean {
  if (!ownership.checker || !ownership.services) {
    return false;
  }

  try {
    const tsNode = ownership.services.esTreeNodeToTSNodeMap.get(node);
    const type = ownership.checker.getTypeAtLocation(tsNode);
    return (
      hasTypeName(type, ownership.checker, names) ||
      hasHeritageName(type, names)
    );
  } catch {
    return false;
  }
}

function isAttachedPropertyType(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  return hasExpressionTypeName(node, ownership, ['AttachedProperty']);
}

function isDialogType(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  return hasExpressionTypeOrHeritageName(node, ownership, ['Dialog']);
}

function isDocumentWidgetType(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  return hasExpressionTypeOrHeritageName(node, ownership, ['DocumentWidget']);
}

function isOwnershipAddCall(
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): boolean {
  if (
    !isStaticMemberCall(node, 'add') ||
    node.callee.type !== 'MemberExpression'
  ) {
    return false;
  }

  return (
    isDisposableSetType(node.callee.object, ownership) ||
    isLikelyDisposableSet(node.callee.object)
  );
}

function isOwnershipSetCall(
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): boolean {
  if (
    !isStaticMemberCall(node, 'set') ||
    node.callee.type !== 'MemberExpression'
  ) {
    return false;
  }

  return (
    isAttachedPropertyType(node.callee.object, ownership) ||
    isLikelyDisposableProperty(node.callee.object)
  );
}

export function isClassFieldCollectionMutationCall(
  node: TSESTree.CallExpression,
  names: readonly string[]
): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    names.includes(getStaticMemberName(node.callee) ?? '') &&
    isThisMemberExpression(node.callee.object)
  );
}

function isArrayExtInsertCall(
  node: TSESTree.CallExpression
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } {
  return (
    isStaticMemberCall(node, 'insert') &&
    node.callee.type === 'MemberExpression' &&
    getCalleeName(node.callee.object) === 'ArrayExt' &&
    node.arguments.length >= 3 &&
    isThisMemberExpression(node.arguments[0])
  );
}

function getOwnershipArguments(
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): TSESTree.CallExpressionArgument[] {
  if (node.callee.type === 'Super') {
    return node.arguments;
  }

  if (isOwnershipAddCall(node, ownership)) {
    return node.arguments;
  }

  if (isDisposableSetFactoryCall(node)) {
    return getDisposableSetFactoryArguments(node);
  }

  if (isOwnershipFunctionCall(node, ownership)) {
    return node.arguments;
  }

  if (isOwnershipSetCall(node, ownership)) {
    return node.arguments.slice(1);
  }

  if (isClassFieldCollectionMutationCall(node, ['set'])) {
    return node.arguments.slice(1);
  }

  if (isClassFieldCollectionMutationCall(node, ['push', 'unshift'])) {
    return node.arguments;
  }

  if (isArrayExtInsertCall(node)) {
    return node.arguments.slice(2, 3);
  }

  return [];
}

function isArgumentOfCallOrNew(
  node: TSESTree.Node
): node is TSESTree.CallExpression | TSESTree.NewExpression {
  return node.type === 'CallExpression' || node.type === 'NewExpression';
}

function getPropertyName(node: TSESTree.Property): string | null {
  if (!node.computed && node.key.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value;
  }
  return null;
}

function getObjectExpression(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node
): TSESTree.ObjectExpression | null {
  if (node.type === 'ObjectExpression') {
    return node;
  }

  const child = getTransparentChild(node);
  if (child) {
    return getObjectExpression(sourceCode, child);
  }

  if (node.type === 'Identifier') {
    const variable = resolveVariable(sourceCode, node);
    const initializer = variable ? getVariableInitializer(variable) : null;
    if (initializer?.type === 'ObjectExpression') {
      return initializer;
    }
  }

  return null;
}

function getManagedOptionNames(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  ownership: DisposableOwnershipContext
): string[] {
  if (node.type === 'NewExpression') {
    const constructorName = getCalleeName(node.callee);
    const names =
      constructorName === null
        ? []
        : (OWNED_CONSTRUCTOR_OPTION_NAMES.get(constructorName) ?? []);
    return [
      ...names,
      ...(isDialogType(node, ownership) ? ['body'] : []),
      ...(isDocumentWidgetType(node, ownership) ? ['content'] : [])
    ];
  }

  const calleeName = getCalleeName(node.callee);
  return calleeName === null
    ? []
    : (OWNED_FUNCTION_OPTION_NAMES.get(calleeName) ?? []);
}

function markManagedKnownOptionVariables(
  pending: PendingDisposableMap,
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  ownership: DisposableOwnershipContext
): void {
  const optionNames = getManagedOptionNames(node, ownership);
  if (optionNames.length === 0) {
    return;
  }

  for (const argument of node.arguments) {
    if (argument.type === 'ObjectExpression') {
      continue;
    }

    const object = getObjectExpression(ownership.sourceCode, argument);
    if (!object) {
      continue;
    }

    for (const property of object.properties) {
      if (
        property.type === 'Property' &&
        optionNames.includes(getPropertyName(property) ?? '')
      ) {
        markManagedVariables(pending, property.value, ownership);
      }
    }
  }
}

function isOptionsObjectValueManaged(
  expression: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  const property = expression.parent;
  if (
    !property ||
    property.type !== 'Property' ||
    property.value !== expression
  ) {
    return false;
  }

  const object = property.parent;
  if (!object || object.type !== 'ObjectExpression') {
    return false;
  }

  const parent = object.parent;
  const propertyName = getPropertyName(property);
  if (
    parent?.type === 'AssignmentPattern' &&
    parent.right === object &&
    propertyName === 'shell'
  ) {
    return true;
  }

  if (!parent || !isArgumentOfCallOrNew(parent)) {
    return false;
  }

  if (!parent.arguments.includes(object as TSESTree.CallExpressionArgument)) {
    return false;
  }

  if (parent.type === 'NewExpression') {
    const constructorName = getCalleeName(parent.callee);
    return (
      propertyName !== null &&
      ((constructorName !== null &&
        (OWNED_CONSTRUCTOR_OPTION_NAMES.get(constructorName)?.includes(
          propertyName
        ) ??
          false)) ||
        (propertyName === 'body' && isDialogType(parent, ownership)) ||
        (propertyName === 'content' && isDocumentWidgetType(parent, ownership)))
    );
  }

  if (getCalleeName(parent.callee) === 'showDialog') {
    return propertyName === 'body';
  }

  const calleeName = getCalleeName(parent.callee);
  if (
    calleeName !== null &&
    propertyName !== null &&
    (OWNED_FUNCTION_OPTION_NAMES.get(calleeName)?.includes(propertyName) ??
      false)
  ) {
    return true;
  }

  return (
    parent.callee.type === 'Super' ||
    getOwnershipArguments(parent, ownership).includes(
      object as TSESTree.CallExpressionArgument
    )
  );
}

function getManagedAggregateExpression(
  node: TSESTree.Node
): TSESTree.Node | null {
  let current = getOuterExpression(node);
  let parent = current.parent;
  let foundAggregate = false;

  while (parent) {
    if (parent.type === 'Property' && parent.value === current) {
      current = parent;
      parent = current.parent;
      foundAggregate = true;
      continue;
    }

    if (
      parent.type === 'ArrayExpression' &&
      parent.elements.includes(current as TSESTree.Expression)
    ) {
      current = parent;
      parent = current.parent;
      foundAggregate = true;
      continue;
    }

    if (
      parent.type === 'ObjectExpression' &&
      parent.properties.includes(current as TSESTree.Property)
    ) {
      current = parent;
      parent = current.parent;
      foundAggregate = true;
      continue;
    }

    break;
  }

  return foundAggregate ? current : null;
}

function isAggregateExpressionManaged(
  expression: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  const aggregate = getManagedAggregateExpression(expression);
  if (!aggregate) {
    return false;
  }

  const outerAggregate = getOuterFallbackExpression(aggregate);
  const parent = outerAggregate.parent;
  if (!parent) {
    return false;
  }

  if (parent.type === 'ReturnStatement' && parent.argument === outerAggregate) {
    return true;
  }

  if (
    parent.type === 'ArrowFunctionExpression' &&
    parent.body === outerAggregate
  ) {
    return true;
  }

  if (
    parent.type === 'AssignmentExpression' &&
    parent.right === outerAggregate &&
    parent.left.type === 'MemberExpression'
  ) {
    return true;
  }

  if (parent.type === 'PropertyDefinition' && parent.value === outerAggregate) {
    return true;
  }

  if (isOptionsObjectValueManaged(outerAggregate, ownership)) {
    return true;
  }

  if (parent.type === 'CallExpression') {
    return getOwnershipArguments(parent, ownership).includes(
      outerAggregate as TSESTree.CallExpressionArgument
    );
  }

  return false;
}

export function isDisposableExpressionManaged(
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): boolean {
  const expression = getOuterFallbackExpression(node);
  const parent = expression.parent;
  if (!parent) {
    return false;
  }

  if (parent.type === 'ReturnStatement' && parent.argument === expression) {
    return true;
  }

  if (parent.type === 'ArrowFunctionExpression' && parent.body === expression) {
    return true;
  }

  if (
    parent.type === 'AssignmentExpression' &&
    parent.right === expression &&
    parent.left.type === 'MemberExpression'
  ) {
    return true;
  }

  if (parent.type === 'PropertyDefinition' && parent.value === expression) {
    return true;
  }

  if (parent.type === 'CallExpression') {
    return getOwnershipArguments(parent, ownership).includes(
      expression as TSESTree.CallExpressionArgument
    );
  }

  if (
    parent.type === 'ArrayExpression' &&
    parent.parent?.type === 'CallExpression'
  ) {
    return getOwnershipArguments(parent.parent, ownership).includes(
      expression as TSESTree.CallExpressionArgument
    );
  }

  if (isOptionsObjectValueManaged(expression, ownership)) {
    return true;
  }

  if (isAggregateExpressionManaged(expression, ownership)) {
    return true;
  }

  if (
    parent.type === 'MemberExpression' &&
    parent.object === expression &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent
  ) {
    if (getStaticMemberName(parent) === 'dispose') {
      return true;
    }
    if (
      getStaticMemberName(parent) === 'launch' &&
      isDialogType(expression, ownership)
    ) {
      return true;
    }
  }

  return false;
}

function isDialogLaunchCall(
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } {
  return (
    isStaticMemberCall(node, 'launch') &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type !== 'Super' &&
    isDialogType(node.callee.object, ownership)
  );
}

function markManagedVariables(
  pending: PendingDisposableMap,
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): void {
  const variables = getIdentifierVariables(ownership.sourceCode, node);
  for (const variable of variables) {
    if (isManagedUse(node, variable, ownership.sourceCode)) {
      markDisposableManaged(pending, variable, node);
    }
  }
}

function markManagedVariablesWithoutScopeCheck(
  pending: PendingDisposableMap,
  node: TSESTree.Node | null | undefined,
  ownership: DisposableOwnershipContext,
  useNode?: TSESTree.Node
): void {
  const variables = getIdentifierVariables(ownership.sourceCode, node);
  for (const variable of variables) {
    markDisposableManaged(pending, variable, useNode);
  }
}

function getDisposedSignalCallback(
  node: TSESTree.CallExpression
): TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | null {
  if (
    !isStaticMemberCall(node, 'connect') ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.object.type !== 'MemberExpression' ||
    getStaticMemberName(node.callee.object) !== 'disposed'
  ) {
    return null;
  }

  const [callback] = node.arguments;
  return callback &&
    (callback.type === 'ArrowFunctionExpression' ||
      callback.type === 'FunctionExpression')
    ? callback
    : null;
}

function getDisposeCallTarget(node: TSESTree.Node): TSESTree.Node | null {
  if (
    node.type === 'CallExpression' &&
    isStaticMemberCall(node, 'dispose') &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type !== 'Super'
  ) {
    return node.callee.object;
  }
  return null;
}

function getUnconditionalDisposeTargets(
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
): TSESTree.Node[] {
  const body = callback.body;
  const expressionTarget = getDisposeCallTarget(body);
  if (expressionTarget) {
    return [expressionTarget];
  }

  if (body.type !== 'BlockStatement') {
    return [];
  }

  return body.body.flatMap(statement => {
    if (statement.type !== 'ExpressionStatement') {
      return [];
    }
    const target = getDisposeCallTarget(statement.expression);
    return target ? [target] : [];
  });
}

function expressionContainsIdentifierName(
  node: TSESTree.Node | null | undefined,
  name: string
): boolean {
  if (!node) {
    return false;
  }

  if (node.type === 'Identifier' && node.name === name) {
    return true;
  }

  const child = getTransparentChild(node);
  if (child) {
    return expressionContainsIdentifierName(child, name);
  }

  if (node.type === 'ArrayExpression') {
    return node.elements.some(element =>
      element && element.type !== 'SpreadElement'
        ? expressionContainsIdentifierName(element, name)
        : false
    );
  }

  if (node.type === 'ObjectExpression') {
    return node.properties.some(property =>
      property.type === 'Property'
        ? expressionContainsIdentifierName(property.value, name)
        : false
    );
  }

  return false;
}

function isOwnershipCallWithIdentifier(
  node: TSESTree.Node,
  name: string,
  ownership: DisposableOwnershipContext
): node is TSESTree.CallExpression {
  return (
    node.type === 'CallExpression' &&
    getOwnershipArguments(node, ownership).some(argument =>
      expressionContainsIdentifierName(argument, name)
    )
  );
}

function forEachCallbackOwnsParameter(
  callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
  parameterName: string,
  ownership: DisposableOwnershipContext
): boolean {
  if (isOwnershipCallWithIdentifier(callback.body, parameterName, ownership)) {
    return true;
  }

  if (callback.body.type !== 'BlockStatement') {
    return false;
  }

  return callback.body.body.some(
    statement =>
      statement.type === 'ExpressionStatement' &&
      isOwnershipCallWithIdentifier(
        statement.expression,
        parameterName,
        ownership
      )
  );
}

function markImmediateForEachOwnership(
  pending: PendingDisposableMap,
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): void {
  if (
    !isStaticMemberCall(node, 'forEach') ||
    node.callee.type !== 'MemberExpression' ||
    node.callee.object.type !== 'ArrayExpression'
  ) {
    return;
  }

  const [callback] = node.arguments;
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' &&
      callback.type !== 'FunctionExpression')
  ) {
    return;
  }

  const [parameter] = callback.params;
  if (
    parameter?.type !== 'Identifier' ||
    !forEachCallbackOwnsParameter(callback, parameter.name, ownership)
  ) {
    return;
  }

  for (const element of node.callee.object.elements) {
    if (element && element.type !== 'SpreadElement') {
      markManagedVariablesWithoutScopeCheck(pending, element, ownership, node);
    }
  }
}

function markDisposedSignalCallbackDisposals(
  pending: PendingDisposableMap,
  node: TSESTree.CallExpression,
  ownership: DisposableOwnershipContext
): void {
  const callback = getDisposedSignalCallback(node);
  if (!callback) {
    return;
  }

  for (const target of getUnconditionalDisposeTargets(callback)) {
    markManagedVariablesWithoutScopeCheck(pending, target, ownership, node);
  }
}

export function markManagedDisposableUse(
  pending: PendingDisposableMap,
  node: TSESTree.Node,
  ownership: DisposableOwnershipContext
): void {
  if (node.type === 'ReturnStatement') {
    if (isInJupyterPluginActivate(node, ownership)) {
      markManagedVariablesWithoutScopeCheck(
        pending,
        node.argument,
        ownership,
        node
      );
      return;
    }

    const variables = getIdentifierVariables(
      ownership.sourceCode,
      node.argument
    );
    for (const variable of variables) {
      if (isManagedUse(node, variable, ownership.sourceCode)) {
        markDisposableManaged(pending, variable, node);
      }
    }
    return;
  }

  if (node.type === 'AssignmentExpression') {
    if (node.left.type === 'MemberExpression') {
      const variables = getIdentifierVariables(
        ownership.sourceCode,
        node.right
      );
      for (const variable of variables) {
        if (isManagedUse(node, variable, ownership.sourceCode)) {
          markDisposableManaged(pending, variable, node);
        }
      }
    }
    return;
  }

  if (node.type !== 'CallExpression' && node.type !== 'NewExpression') {
    return;
  }

  if (node.type === 'CallExpression') {
    markDisposedSignalCallbackDisposals(pending, node, ownership);
    markImmediateForEachOwnership(pending, node, ownership);
  }

  markManagedKnownOptionVariables(pending, node, ownership);

  for (const argument of node.arguments) {
    if (argument.type !== 'ObjectExpression') {
      continue;
    }
    for (const property of argument.properties) {
      if (
        property.type === 'Property' &&
        isOptionsObjectValueManaged(property.value, ownership)
      ) {
        markManagedVariables(pending, property.value, ownership);
      }
    }
  }

  if (node.type === 'NewExpression') {
    return;
  }

  const ownershipArguments = getOwnershipArguments(node, ownership);
  if (ownershipArguments.length > 0) {
    for (const argument of ownershipArguments) {
      markManagedVariables(pending, argument, ownership);
    }
    return;
  }

  if (
    isStaticMemberCall(node, 'dispose') &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type !== 'Super'
  ) {
    const variable = getIdentifierVariable(
      ownership.sourceCode,
      node.callee.object
    );
    if (variable) {
      if (
        isManagedUse(node, variable, ownership.sourceCode) ||
        (hasPendingDisposableSet(pending, variable) &&
          !isCatchClauseUse(node, variable))
      ) {
        markDisposableManaged(pending, variable, node);
      }
    }
  }

  if (isDialogLaunchCall(node, ownership)) {
    const variable = getIdentifierVariable(
      ownership.sourceCode,
      node.callee.object
    );
    if (variable && isManagedUse(node, variable, ownership.sourceCode)) {
      markDisposableManaged(pending, variable, node);
    }
  }
}

function hasDisposableTypeName(
  type: ts.Type,
  checker: ts.TypeChecker
): boolean {
  return (
    hasTypeName(type, checker, DISPOSABLE_INTERFACE_NAMES) ||
    hasTypeName(type, checker, DISPOSABLE_CONSTRUCTOR_NAMES)
  );
}

function declarationHasDisposableHeritage(
  declaration: ts.Declaration
): boolean {
  return declarationHasHeritageName(declaration, [
    ...DISPOSABLE_INTERFACE_NAMES,
    ...DISPOSABLE_CONSTRUCTOR_NAMES
  ]);
}

function hasDisposableHeritage(type: ts.Type): boolean {
  const symbol = type.getSymbol();
  return symbol?.declarations?.some(declarationHasDisposableHeritage) ?? false;
}

function hasDisposableShape(type: ts.Type, checker: ts.TypeChecker): boolean {
  const dispose = type.getProperty('dispose');
  const isDisposed = type.getProperty('isDisposed');
  if (!dispose || !isDisposed) {
    return false;
  }

  const declaration = dispose.valueDeclaration ?? dispose.declarations?.[0];
  if (!declaration) {
    return false;
  }

  const disposeType = checker.getTypeOfSymbolAtLocation(dispose, declaration);
  return disposeType.getCallSignatures().length > 0;
}

export function isDisposableType(
  type: ts.Type,
  checker: ts.TypeChecker,
  seen = new Set<ts.Type>()
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);

  if (type.isUnion()) {
    return type.types.some(part => isDisposableType(part, checker, seen));
  }

  if (type.isIntersection()) {
    return type.types.some(part => isDisposableType(part, checker, seen));
  }

  const apparentType = checker.getApparentType(type);

  return (
    hasDisposableTypeName(type, checker) ||
    hasDisposableHeritage(type) ||
    hasDisposableShape(apparentType, checker)
  );
}

export function shouldCheckReturnedDisposable(
  node: TSESTree.CallExpression
): boolean {
  const expression = getOuterFallbackExpression(node);
  const parent = expression.parent;
  if (!parent) {
    return false;
  }

  if (
    parent.type === 'ExpressionStatement' ||
    parent.type === 'ReturnStatement'
  ) {
    return true;
  }

  if (parent.type === 'VariableDeclarator' && parent.init === expression) {
    return true;
  }

  if (parent.type === 'AssignmentExpression' && parent.right === expression) {
    return true;
  }

  if (parent.type === 'PropertyDefinition' && parent.value === expression) {
    return true;
  }

  if (
    parent.type === 'UnaryExpression' &&
    parent.operator === 'void' &&
    parent.argument === expression
  ) {
    return true;
  }

  if (parent.type === 'CallExpression' || parent.type === 'NewExpression') {
    return parent.arguments.includes(
      expression as TSESTree.CallExpressionArgument
    );
  }

  if (
    parent.type === 'ArrayExpression' &&
    (parent.parent?.type === 'CallExpression' ||
      parent.parent?.type === 'NewExpression') &&
    parent.parent.arguments.includes(parent as TSESTree.CallExpressionArgument)
  ) {
    return true;
  }

  return parent.type === 'MemberExpression' && parent.object === expression;
}
