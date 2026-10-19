/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ASTUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import * as ts from 'typescript';

export type JupyterPluginKind =
  | 'frontend'
  | 'service-manager'
  | 'mime-renderer'
  | 'ambiguous';

/**
 * Gets plugin kind from a variable declaration type annotation.
 * Accepts an optional TS checker and node mapper to resolve import aliases
 * (e.g. `import { JupyterFrontEndPlugin as JFEP } from '@jupyterlab/application'`).
 */
export function getJupyterPluginKind(
  node: TSESTree.VariableDeclarator,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): JupyterPluginKind | null {
  const id = node.id;
  if (id.type !== 'Identifier' || !id.typeAnnotation) {
    return null;
  }

  const typeNode = id.typeAnnotation.typeAnnotation;
  if (typeNode.type !== 'TSTypeReference') {
    return null;
  }

  // Fast path: direct string match (no alias), including namespaced like Private.JupyterFrontEndPlugin.
  const pluginTypeName = extractTypeName(typeNode.typeName);
  const fastKind = getPluginKindFromTypeName(pluginTypeName);
  if (fastKind) {
    return fastKind;
  }

  // Slow path: resolve import aliases via the TS checker.
  if (checker && getTSNode && typeNode.typeName.type === 'Identifier') {
    const resolvedName = resolveTypeAlias(
      typeNode.typeName,
      checker,
      getTSNode
    );
    const resolvedKind = getPluginKindFromTypeName(resolvedName);
    if (resolvedKind) {
      return resolvedKind;
    }
  }

  return null;
}

/**
 * Extracts properties from an object expression
 */
export function getObjectProperties(
  obj: TSESTree.ObjectExpression
): Map<string, TSESTree.Property> {
  const props = new Map<string, TSESTree.Property>();
  for (const prop of obj.properties) {
    if (prop.type === 'Property' && !prop.computed) {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName) {
        props.set(keyName, prop);
      }
    }
  }
  return props;
}

/**
 * Gets the plugin ID from an object expression. Without a scope only a
 * literal, a template literal without substitutions or a `+` chain of literals
 * resolves. With a scope, a `const` string and a member of a `const` object
 * resolve too, and with a checker so does anything with a string literal
 * type, such as a `const` imported from another module.
 */
export function getPluginId(
  obj: TSESTree.ObjectExpression,
  scope?: TSESLint.Scope.Scope | null,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): string | null {
  const idProperty = getObjectProperties(obj).get('id');
  return idProperty
    ? resolveStaticString(idProperty.value, scope, checker, getTSNode)
    : null;
}

/**
 * Resolves an expression to the string it holds at lint time.
 * `getStaticValue` folds the plain JavaScript part: a literal, a template
 * literal, a `+` chain, a variable that is never reassigned and a member of an
 * object literal that is never mutated, with TypeScript casts stripped. The
 * checker then answers for the TypeScript part: a `const` imported from
 * another module, a namespace member, an enum member or a `static readonly`
 * class property.
 */
export function resolveStaticString(
  node: TSESTree.Node,
  scope?: TSESLint.Scope.Scope | null,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): string | null {
  const folded = ASTUtils.getStaticValue(node, scope ?? undefined);
  if (typeof folded?.value === 'string') {
    return folded.value;
  }
  if (!checker || !getTSNode) {
    return null;
  }
  try {
    const tsNode = getTSNode(node);
    if (!tsNode) {
      return null;
    }
    const type = checker.getTypeAtLocation(tsNode);
    return type.isStringLiteral() ? type.value : null;
  } catch {
    return null;
  }
}
export interface TokenEntry {
  name: string;
  node: TSESTree.Node;
}

/**
 * Extracts token names and nodes from an array, including member expressions like JupyterFrontEnd.IPaths
 */
export function extractArrayTokens(
  arrayExpr: TSESTree.ArrayExpression
): TokenEntry[] {
  const entries: TokenEntry[] = [];

  for (const element of arrayExpr.elements) {
    if (element === null) continue;

    if (element.type === 'Identifier') {
      entries.push({ name: element.name, node: element });
    } else if (element.type === 'MemberExpression') {
      if (
        element.object.type === 'Identifier' &&
        element.property.type === 'Identifier'
      ) {
        entries.push({
          name: `${element.object.name}.${element.property.name}`,
          node: element
        });
      }
    }
  }

  return entries;
}
export function isNullableAnnotation(param: TSESTree.Identifier): boolean {
  if (!param.typeAnnotation) return false;
  const typeNode = param.typeAnnotation.typeAnnotation;
  if (typeNode.type !== 'TSUnionType') return false;
  return typeNode.types.some(
    t => t.type === 'TSNullKeyword' || t.type === 'TSUndefinedKeyword'
  );
}

export function extractParameterType(
  param: TSESTree.Identifier
): string | null {
  if (!param.typeAnnotation) {
    return null;
  }

  const typeNode = param.typeAnnotation.typeAnnotation;

  // Handle TSTypeReference (like JupyterFrontEnd.IPaths)
  if (typeNode.type === 'TSTypeReference') {
    return extractTypeName(typeNode.typeName);
  }

  if (typeNode.type === 'TSUnionType') {
    const nonNullType = typeNode.types.find(t => t.type !== 'TSNullKeyword');
    if (nonNullType && nonNullType.type === 'TSTypeReference') {
      return extractTypeName(nonNullType.typeName);
    }
  }

  return null;
}

/**
 * Recursively extracts the full name from a TSTypeReference typeName node,
 * handling both simple Identifiers and qualified names (TSQualifiedName)
 * e.g. `IType` -> "IType", `JupyterFrontEnd.IPaths` -> "JupyterFrontEnd.IPaths"
 */
function extractTypeName(typeName: TSESTree.EntityName): string | null {
  if (typeName.type === 'Identifier') {
    return typeName.name;
  }

  if (typeName.type === 'TSQualifiedName') {
    const left = extractTypeName(typeName.left);
    const right = typeName.right?.name;
    if (left && right) {
      return `${left}.${right}`;
    }
  }

  return null;
}

/**
 * Returns true when a type name refers to a JupyterLab plugin type. Only the
 * last segment is compared, so a namespaced spelling such as
 * `Private.JupyterFrontEndPlugin` or `app.JupyterFrontEndPlugin` matches too.
 */
export function isPluginTypeName(name: string | null): boolean {
  return getPluginKindFromTypeName(name) !== null;
}

/**
 * Resolves the plugin kind ('frontend' or 'service-manager') from a type name.
 * Compares the last segment so qualified names like `app.JupyterFrontEndPlugin` match.
 */
export function getPluginKindFromTypeName(
  name: string | null
): JupyterPluginKind | null {
  if (!name) {
    return null;
  }
  const lastSegment = name.split('.').pop() ?? name;
  if (lastSegment === 'JupyterFrontEndPlugin') {
    return 'frontend';
  }
  if (lastSegment === 'ServiceManagerPlugin') {
    return 'service-manager';
  }
  return null;
}

/**
 * Generic types whose first type argument is unwrapped when resolving a plugin
 * kind. Arbitrary wrappers such as `Wrapper<T>` or `Omit<T, 'description'>`
 * are deliberately left out, since they need not describe a plugin object.
 */
const ALLOWED_GENERIC_WRAPPERS = new Set([
  'Array',
  'ReadonlyArray',
  'Partial',
  'Promise',
  'Readonly',
  'Required'
]);

/**
 * The application types which make a Lumino `IPlugin<T, U>` a JupyterLab
 * frontend plugin. A bare Lumino `Application` is left out, so plain Lumino
 * plugins are not held to JupyterLab's conventions.
 */
const FRONTEND_APPLICATION_TYPES = new Set(['JupyterFrontEnd', 'JupyterLab']);

/**
 * Collapses the kinds found in the members of a union, intersection or tuple:
 * the single kind when they agree, 'ambiguous' when they differ.
 */
function mergeKinds(
  kinds: Iterable<JupyterPluginKind | null>
): JupyterPluginKind | null {
  const found = new Set<JupyterPluginKind>();
  for (const kind of kinds) {
    if (kind) {
      found.add(kind);
    }
  }
  if (found.size > 1) {
    return 'ambiguous';
  }
  return found.size === 1 ? Array.from(found)[0] : null;
}

/**
 * Resolves the plugin kind ('frontend' or 'service-manager') from a TypeScript Type.
 */
export function getPluginKindFromTsType(
  type: ts.Type,
  checker: ts.TypeChecker,
  depth = 0
): JupyterPluginKind | null {
  if (depth > 6) {
    return null;
  }

  if (type.isUnion() || type.isIntersection()) {
    return mergeKinds(
      type.types.map(t => getPluginKindFromTsType(t, checker, depth + 1))
    );
  }

  // Mapped wrappers such as `Partial<T>` and `Readonly<T>` only keep their
  // argument as an alias type argument.
  const aliasName = type.aliasSymbol?.getName();
  const aliasArg = type.aliasTypeArguments?.[0];
  if (aliasName && aliasArg && ALLOWED_GENERIC_WRAPPERS.has(aliasName)) {
    return getPluginKindFromTsType(aliasArg, checker, depth + 1);
  }

  let symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    try {
      symbol = checker.getAliasedSymbol(symbol);
    } catch {
      // ignore
    }
  }
  const name = symbol?.getName();
  if (name) {
    const kind = getPluginKindFromTypeName(name);
    if (kind) {
      return kind;
    }
  }

  const targetSymbol = type.getSymbol();
  const targetName = targetSymbol?.getName();
  if (targetName && targetName !== name) {
    const kind = getPluginKindFromTypeName(targetName);
    if (kind) {
      return kind;
    }
  }

  // Handle IPlugin<T, ...> interface from @lumino/application
  if (name === 'IPlugin' || targetName === 'IPlugin') {
    try {
      const typeRef = type as ts.TypeReference;
      const typeArgs = checker.getTypeArguments(typeRef);
      if (typeArgs && typeArgs.length > 0) {
        const firstArg = typeArgs[0];
        const firstArgSymbol = firstArg.aliasSymbol ?? firstArg.getSymbol();
        const firstArgName = firstArgSymbol?.getName();
        if (firstArgName && FRONTEND_APPLICATION_TYPES.has(firstArgName)) {
          return 'frontend';
        }
        if (firstArg.flags & ts.TypeFlags.Null) {
          return 'service-manager';
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Returns true when `matches` accepts a type reference found at any depth of
 * a type annotation, so arrays, unions and wrappers such as `Promise<...>` are
 * recognised.
 */
function typeMentions(
  typeNode: TSESTree.TypeNode | undefined | null,
  matches: (reference: TSESTree.TSTypeReference) => boolean,
  depth = 0
): boolean {
  if (!typeNode || depth > 6) {
    return false;
  }

  switch (typeNode.type) {
    case 'TSTypeReference':
      if (matches(typeNode)) {
        return true;
      }
      return (typeNode.typeArguments?.params ?? []).some(param =>
        typeMentions(param, matches, depth + 1)
      );
    case 'TSArrayType':
      return typeMentions(typeNode.elementType, matches, depth + 1);
    case 'TSUnionType':
    case 'TSIntersectionType':
      return typeNode.types.some(type =>
        typeMentions(type, matches, depth + 1)
      );
    case 'TSTupleType':
      return typeNode.elementTypes.some(type =>
        typeMentions(type, matches, depth + 1)
      );
    case 'TSTypeOperator':
    case 'TSRestType':
    case 'TSOptionalType':
      return typeMentions(typeNode.typeAnnotation ?? null, matches, depth + 1);
    case 'TSNamedTupleMember':
      return typeMentions(typeNode.elementType, matches, depth + 1);
    default:
      return false;
  }
}

/**
 * Returns true when a type annotation mentions a JupyterLab plugin type at any
 * depth, so arrays, unions and wrappers such as `Promise<...>` are recognised.
 * Resolves import aliases through the TypeScript checker when it is available.
 */
export function typeMentionsJupyterPlugin(
  typeNode: TSESTree.TypeNode | undefined | null,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): boolean {
  return typeMentions(typeNode, reference => {
    if (isPluginTypeName(extractTypeName(reference.typeName))) {
      return true;
    }
    return (
      !!checker &&
      !!getTSNode &&
      reference.typeName.type === 'Identifier' &&
      isPluginTypeName(resolveTypeAlias(reference.typeName, checker, getTSNode))
    );
  });
}

/** The namespace and interface which type a MIME renderer extension entry. */
const MIME_EXTENSION_NAMESPACE = 'IRenderMime';
const MIME_EXTENSION_TYPE_NAME = 'IExtension';

/**
 * Returns true when a type reference is `IRenderMime.IExtension`. Only the
 * qualified spelling counts, because a bare `IExtension` is too common a name
 * to mean anything on its own. The namespace may sit behind a module import
 * (`Interfaces.IRenderMime.IExtension`), and a renamed import such as
 * `import { IRenderMime as RM }` is resolved through the TypeScript checker
 * when it is available.
 */
function isMimeExtensionReference(
  reference: TSESTree.TSTypeReference,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null
): boolean {
  const typeName = reference.typeName;
  if (
    typeName.type !== 'TSQualifiedName' ||
    typeName.right.name !== MIME_EXTENSION_TYPE_NAME
  ) {
    return false;
  }
  const namespace = extractTypeName(typeName.left)?.split('.').pop();
  if (namespace === MIME_EXTENSION_NAMESPACE) {
    return true;
  }
  return (
    !!checker &&
    !!getTSNode &&
    typeName.left.type === 'Identifier' &&
    resolveTypeAlias(typeName.left, checker, getTSNode) ===
      MIME_EXTENSION_NAMESPACE
  );
}

/**
 * Resolves an identifier through the TypeScript checker to the name it aliases,
 * e.g. `import { JupyterFrontEndPlugin as JFEP }` gives back the original name.
 */
function resolveTypeAlias(
  identifier: TSESTree.Identifier,
  checker: ts.TypeChecker,
  getTSNode: (n: TSESTree.Node) => ts.Node | undefined
): string | null {
  try {
    const tsNode = getTSNode(identifier);
    if (!tsNode) {
      return null;
    }
    const symbol = checker.getSymbolAtLocation(tsNode);
    if (!symbol) {
      return null;
    }
    const resolved =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    return resolved.getName();
  } catch {
    return null;
  }
}

const PLUGIN_SHAPE_PROPERTIES = [
  'autoStart',
  'requires',
  'optional',
  'provides',
  'description'
];

/**
 * Returns true when a property holds something callable: a function written in
 * place, or a name referring to one declared elsewhere.
 */
export function isCallableProperty(
  property: TSESTree.Property | undefined
): boolean {
  if (!property) {
    return false;
  }
  switch (property.value.type) {
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'Identifier':
    case 'MemberExpression':
      return true;
    default:
      return false;
  }
}

/**
 * Returns true when an object literal has the shape of a JupyterLab plugin:
 * a string `id`, an `activate` function, and at least one of the properties
 * which only plugins carry. Used for plugin objects written without a type
 * annotation. A caller that resolves the ID itself passes whether one is
 * present, so this check needs no type information.
 */
export function looksLikePluginObject(
  node: TSESTree.ObjectExpression,
  hasId: boolean = getPluginId(node) !== null
): boolean {
  const properties = getObjectProperties(node);

  if (!hasId || !properties.has('id')) {
    return false;
  }

  if (!isCallableProperty(properties.get('activate'))) {
    return false;
  }

  return PLUGIN_SHAPE_PROPERTIES.some(name => properties.has(name));
}

/**
 * Returns true when an object literal has the shape of a MIME renderer
 * extension entry: a string `id` and a `rendererFactory`. Used for entries
 * written without a type annotation. A caller that resolves the ID itself
 * passes whether one is present.
 */
export function looksLikeMimeExtensionObject(
  node: TSESTree.ObjectExpression,
  hasId: boolean = getPluginId(node) !== null
): boolean {
  const properties = getObjectProperties(node);
  return hasId && properties.has('id') && properties.has('rendererFactory');
}

/**
 * Finds the function that owns a return statement.
 */
export function getEnclosingFunction(
  node: TSESTree.Node
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | null {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Resolves the plugin kind from a TypeScript type annotation node, unwrapping
 * arrays, tuples, type operators (readonly), unions, and allowed generic containers.
 * Returns 'ambiguous' if types are mixed (e.g. union or tuple containing multiple distinct plugin kinds).
 */
export function getPluginKindFromType(
  typeNode: TSESTree.TypeNode | undefined | null,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null,
  options?: { matchMime?: boolean },
  depth = 0
): JupyterPluginKind | null {
  if (!typeNode || depth > 6) {
    return null;
  }

  if (typeNode.type === 'TSTypeReference') {
    const name = extractTypeName(typeNode.typeName);
    const directKind = getPluginKindFromTypeName(name);
    if (directKind) {
      return directKind;
    }
    if (
      options?.matchMime &&
      isMimeExtensionReference(typeNode, checker, getTSNode)
    ) {
      return 'mime-renderer';
    }

    if (checker && getTSNode && typeNode.typeName.type === 'Identifier') {
      const resolved = resolveTypeAlias(typeNode.typeName, checker, getTSNode);
      const aliasKind = getPluginKindFromTypeName(resolved);
      if (aliasKind) {
        return aliasKind;
      }
    }

    // Handle IPlugin<T, ...> in AST
    const baseName = name ? (name.split('.').pop() ?? name) : null;
    if (baseName === 'IPlugin') {
      const firstParam = typeNode.typeArguments?.params?.[0];
      if (firstParam) {
        if (firstParam.type === 'TSTypeReference') {
          const firstParamName = extractTypeName(firstParam.typeName);
          const firstBase = firstParamName
            ? (firstParamName.split('.').pop() ?? firstParamName)
            : null;
          if (firstBase && FRONTEND_APPLICATION_TYPES.has(firstBase)) {
            return 'frontend';
          }
        } else if (firstParam.type === 'TSNullKeyword') {
          return 'service-manager';
        }
      }
    }

    // Only unwrap generic containers in the allowed set; arbitrary wrappers
    // such as Wrapper<T> or Omit<T, 'description'> are not plugins.
    if (
      baseName &&
      ALLOWED_GENERIC_WRAPPERS.has(baseName) &&
      typeNode.typeArguments?.params &&
      typeNode.typeArguments.params.length > 0
    ) {
      return getPluginKindFromType(
        typeNode.typeArguments.params[0],
        checker,
        getTSNode,
        options,
        depth + 1
      );
    }

    return null;
  }

  if (typeNode.type === 'TSArrayType') {
    return getPluginKindFromType(
      typeNode.elementType,
      checker,
      getTSNode,
      options,
      depth + 1
    );
  }

  if (typeNode.type === 'TSTupleType') {
    return mergeKinds(
      typeNode.elementTypes.map(member =>
        getPluginKindFromType(
          unwrapTupleMember(member),
          checker,
          getTSNode,
          options,
          depth + 1
        )
      )
    );
  }

  if (typeNode.type === 'TSTypeOperator' && typeNode.operator === 'readonly') {
    return getPluginKindFromType(
      typeNode.typeAnnotation,
      checker,
      getTSNode,
      options,
      depth + 1
    );
  }

  if (
    typeNode.type === 'TSUnionType' ||
    typeNode.type === 'TSIntersectionType'
  ) {
    return mergeKinds(
      typeNode.types.map(t =>
        getPluginKindFromType(t, checker, getTSNode, options, depth + 1)
      )
    );
  }

  return null;
}

function getEnclosingFunctionReturnType(
  expr: TSESTree.Node
): TSESTree.TypeNode | null {
  const parent = expr.parent;
  if (parent?.type === 'ReturnStatement' && parent.argument === expr) {
    const fn = getEnclosingFunction(parent);
    return fn?.returnType?.typeAnnotation ?? null;
  }
  if (parent?.type === 'ArrowFunctionExpression' && parent.body === expr) {
    return parent.returnType?.typeAnnotation ?? null;
  }
  return null;
}

function getKindFromEnclosingFunctionReturn(
  expr: TSESTree.Node,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null,
  options?: PluginObjectKindOptions
): JupyterPluginKind | null {
  const returnType = getEnclosingFunctionReturnType(expr);
  if (returnType) {
    return getPluginKindFromType(returnType, checker, getTSNode, options);
  }
  return null;
}

function getTupleElementKind(
  typeNode: TSESTree.TypeNode | undefined | null,
  elementIndex: number,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null,
  options?: PluginObjectKindOptions
): JupyterPluginKind | null {
  if (!typeNode || elementIndex < 0) {
    return null;
  }

  if (typeNode.type === 'TSTypeOperator' && typeNode.operator === 'readonly') {
    return getTupleElementKind(
      typeNode.typeAnnotation,
      elementIndex,
      checker,
      getTSNode,
      options
    );
  }

  if (typeNode.type === 'TSTupleType') {
    const members = typeNode.elementTypes;
    if (elementIndex < members.length) {
      return getPluginKindFromType(
        unwrapTupleMember(members[elementIndex]),
        checker,
        getTSNode,
        options
      );
    }
    // Past the fixed members, elements take the type of a trailing rest member.
    const last = members[members.length - 1];
    const lastType =
      last?.type === 'TSNamedTupleMember' ? last.elementType : last;
    if (lastType?.type === 'TSRestType') {
      return getPluginKindFromType(
        lastType.typeAnnotation,
        checker,
        getTSNode,
        options
      );
    }
  }

  return null;
}

/**
 * Returns the element type of a tuple member, looking through labels,
 * optional markers and rest spreads.
 */
function unwrapTupleMember(member: TSESTree.TypeNode): TSESTree.TypeNode {
  let elementType =
    member.type === 'TSNamedTupleMember' ? member.elementType : member;
  if (elementType.type === 'TSOptionalType') {
    elementType = elementType.typeAnnotation;
  }
  if (elementType.type === 'TSRestType') {
    elementType = elementType.typeAnnotation;
  }
  return elementType;
}

export interface PluginObjectKindOptions {
  allowUntyped?: boolean;
  matchMime?: boolean;
}

/**
 * Returns the plugin kind ('frontend', 'service-manager', or 'mime-renderer')
 * for an object literal expression by inspecting its type annotation, type cast,
 * enclosing array/tuple, factory function return type, or shape (when allowUntyped is true).
 */
export function getPluginObjectKind(
  node: TSESTree.ObjectExpression,
  checker?: ts.TypeChecker | null,
  getTSNode?: ((n: TSESTree.Node) => ts.Node | undefined) | null,
  options?: PluginObjectKindOptions
): JupyterPluginKind | null {
  // 0. If checker is available, resolve contextual type per element.
  if (checker && getTSNode) {
    const tsNode = getTSNode(node);
    if (tsNode) {
      try {
        const contextualType = checker.getContextualType(
          tsNode as ts.Expression
        );
        if (contextualType) {
          const kind = getPluginKindFromTsType(contextualType, checker);
          if (kind) {
            return kind;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 1. Unwrap any type assertions directly wrapping the object expression.
  let current: TSESTree.Node = node;
  while (
    current.parent &&
    (current.parent.type === 'TSAsExpression' ||
      current.parent.type === 'TSSatisfiesExpression' ||
      current.parent.type === 'TSTypeAssertion')
  ) {
    const castNode = current.parent as
      | TSESTree.TSAsExpression
      | TSESTree.TSSatisfiesExpression
      | TSESTree.TSTypeAssertion;
    const kind = getPluginKindFromType(
      castNode.typeAnnotation,
      checker,
      getTSNode,
      options
    );
    if (kind) {
      return kind;
    }
    current = castNode;
  }

  // 2. Check if current is directly assigned to a typed variable declarator.
  if (current.parent?.type === 'VariableDeclarator') {
    const varDecl = current.parent;
    if (varDecl.id.type === 'Identifier' && varDecl.id.typeAnnotation) {
      const kind = getPluginKindFromType(
        varDecl.id.typeAnnotation.typeAnnotation,
        checker,
        getTSNode,
        options
      );
      if (kind) {
        return kind;
      }
    }
  }

  // 3. Check if current is returned from a function with an explicit return type.
  const returnedKind = getKindFromEnclosingFunctionReturn(
    current,
    checker,
    getTSNode,
    options
  );
  if (returnedKind) {
    return returnedKind;
  }

  // 4. Check if current is an element of an ArrayExpression.
  if (current.parent?.type === 'ArrayExpression') {
    const arrayElements = current.parent.elements;
    const elementIndex = arrayElements.indexOf(current as TSESTree.Expression);
    let arrayNode: TSESTree.Node = current.parent;

    while (
      arrayNode.parent &&
      (arrayNode.parent.type === 'TSAsExpression' ||
        arrayNode.parent.type === 'TSSatisfiesExpression' ||
        arrayNode.parent.type === 'TSTypeAssertion')
    ) {
      const castNode = arrayNode.parent as
        | TSESTree.TSAsExpression
        | TSESTree.TSSatisfiesExpression
        | TSESTree.TSTypeAssertion;
      const tupleKind = getTupleElementKind(
        castNode.typeAnnotation,
        elementIndex,
        checker,
        getTSNode,
        options
      );
      if (tupleKind) {
        return tupleKind;
      }
      const kind = getPluginKindFromType(
        castNode.typeAnnotation,
        checker,
        getTSNode,
        options
      );
      if (kind) {
        return kind;
      }
      arrayNode = castNode;
    }

    if (arrayNode.parent?.type === 'VariableDeclarator') {
      const varDecl = arrayNode.parent;
      if (varDecl.id.type === 'Identifier' && varDecl.id.typeAnnotation) {
        const typeAnnotation = varDecl.id.typeAnnotation.typeAnnotation;
        const tupleKind = getTupleElementKind(
          typeAnnotation,
          elementIndex,
          checker,
          getTSNode,
          options
        );
        if (tupleKind) {
          return tupleKind;
        }
        const kind = getPluginKindFromType(
          typeAnnotation,
          checker,
          getTSNode,
          options
        );
        if (kind) {
          return kind;
        }
      }
    }

    const enclosingFnType = getEnclosingFunctionReturnType(arrayNode);
    if (enclosingFnType) {
      const tupleKind = getTupleElementKind(
        enclosingFnType,
        elementIndex,
        checker,
        getTSNode,
        options
      );
      if (tupleKind) {
        return tupleKind;
      }
    }

    const returnedArrayKind = getKindFromEnclosingFunctionReturn(
      arrayNode,
      checker,
      getTSNode,
      options
    );
    if (returnedArrayKind) {
      return returnedArrayKind;
    }
  }

  // 5. If untyped plugin detection is enabled, check shape.
  if (options?.allowUntyped) {
    const hasId = getObjectProperties(node).has('id');
    if (looksLikePluginObject(node, hasId)) {
      return 'frontend';
    }
    if (options.matchMime && looksLikeMimeExtensionObject(node, hasId)) {
      return 'mime-renderer';
    }
  }

  return null;
}
