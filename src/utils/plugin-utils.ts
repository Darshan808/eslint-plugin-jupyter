/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';

export type JupyterPluginKind = 'frontend' | 'service-manager';

/**
 * Gets plugin kind from a variable declaration type annotation.
 */
export function getJupyterPluginKind(
  node: TSESTree.VariableDeclarator
): JupyterPluginKind | null {
  const id = node.id;
  if (id.type !== 'Identifier' || !id.typeAnnotation) {
    return null;
  }

  const typeNode = id.typeAnnotation.typeAnnotation;
  if (typeNode.type !== 'TSTypeReference') {
    return null;
  }

  const pluginTypeName = extractTypeName(typeNode.typeName);
  if (pluginTypeName === 'JupyterFrontEndPlugin') {
    return 'frontend';
  }
  if (pluginTypeName === 'ServiceManagerPlugin') {
    return 'service-manager';
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
 * Gets the plugin ID from an object expression
 */
export function getPluginId(obj: TSESTree.ObjectExpression): string | null {
  for (const prop of obj.properties) {
    if (prop.type === 'Property') {
      let keyName: string | null = null;
      if (prop.key.type === 'Identifier') {
        keyName = prop.key.name;
      } else if (
        prop.key.type === 'Literal' &&
        typeof prop.key.value === 'string'
      ) {
        keyName = prop.key.value;
      }
      if (keyName === 'id' && prop.value.type === 'Literal') {
        const value = prop.value.value;
        if (typeof value === 'string') {
          return value;
        }
      }
    }
  }
  return null;
}

/**
 * Extracts element names from an array, including member expressions like JupyterFrontEnd.IPaths
 */
export function extractArrayElements(
  arrayExpr: TSESTree.ArrayExpression
): string[] {
  const names: string[] = [];

  for (const element of arrayExpr.elements) {
    if (element === null) continue;

    if (element.type === 'Identifier') {
      names.push(element.name);
    } else if (element.type === 'MemberExpression') {
      if (
        element.object.type === 'Identifier' &&
        element.property.type === 'Identifier'
      ) {
        names.push(`${element.object.name}.${element.property.name}`);
      }
    }
  }

  return names;
}
export function extractParameterType(param: TSESTree.Identifier): string | null {
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
