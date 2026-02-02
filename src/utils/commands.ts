import * as ESTree from 'estree';

/**
 * Checks if a node represents *.addCommand()
 */
export function isAddCommandCall(node: ESTree.CallExpression): boolean {
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
