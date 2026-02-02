import * as ESTree from 'estree';

/**
 * Extracts properties from an object expression
 */
export function getObjectProperties(
  obj: ESTree.ObjectExpression
): Map<string, ESTree.Property> {
  const props = new Map<string, ESTree.Property>();
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
 * Checks if a variable declaration has a JupyterFrontEndPlugin type annotation
 */
export function hasJupyterPluginType(node: ESTree.VariableDeclarator): boolean {
  // Check if the variable declarator has a type annotation
  const id = node.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((id as any).typeAnnotation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typeAnnotation = (id as any).typeAnnotation;
    if (typeAnnotation.typeAnnotation) {
      const typeNode = typeAnnotation.typeAnnotation;
      if (typeNode.type === 'TSTypeReference' && typeNode.typeName) {
        if (typeNode.typeName.type === 'Identifier') {
          return typeNode.typeName.name === 'JupyterFrontEndPlugin';
        }
      }
    }
  }
  return false;
}

/**
 * Gets the plugin ID from an object expression
 */
export function getPluginId(obj: ESTree.ObjectExpression): string | null {
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
        const value = (prop.value as ESTree.Literal).value;
        if (typeof value === 'string') {
          return value;
        }
      }
    }
  }
  return null;
}

/**
 * Extracts identifier names from an array expression
 * Useful for extracting token names from requires/optional arrays
 */
export function extractIdentifierNames(
  arrayNode: ESTree.ArrayExpression
): string[] {
  return arrayNode.elements
    .filter((elem): elem is ESTree.Identifier => {
      return elem !== null && elem.type === 'Identifier';
    })
    .map(id => id.name);
}

/**
 * Extracts type annotation from a function parameter
 * Returns the type name if it has a type annotation, null otherwise
 */
export function extractParameterType(param: ESTree.Identifier): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((param as any).typeAnnotation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotation = (param as any).typeAnnotation;
    if (annotation && annotation.typeAnnotation) {
      const typeNode = annotation.typeAnnotation;

      // Handle TSTypeReference (e.g., type: IType)
      if (typeNode.type === 'TSTypeReference' && typeNode.typeName) {
        if (typeNode.typeName.type === 'Identifier') {
          return typeNode.typeName.name;
        }
      }

      // Handle TSUnionType (e.g., type: IType | null)
      if (typeNode.type === 'TSUnionType') {
        const types = typeNode.types;
        if (Array.isArray(types) && types.length > 0) {
          const nonNullType = types.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.type !== 'TSNullKeyword'
          );
          if (nonNullType && nonNullType.type === 'TSTypeReference') {
            if (
              nonNullType.typeName &&
              nonNullType.typeName.type === 'Identifier'
            ) {
              return nonNullType.typeName.name;
            }
          }
        }
      }
    }
  }

  return null;
}
