/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';

/**
 * Methods of the TranslationBundle interface from `@jupyterlab/translation`.
 */
export const BUNDLE_METHODS = new Set([
  '__',
  '_n',
  '_p',
  '_np',
  'gettext',
  'ngettext',
  'pgettext',
  'npgettext',
  'dcnpgettext'
]);

/**
 * Property names under which a translation bundle may be stored so that the
 * string extractor recognizes its usages (this.trans, this._trans,
 * this.props.trans, props.trans).
 * See jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules
 */
export const BUNDLE_PROPERTY_NAMES = new Set(['trans', '_trans']);

/**
 * The only accepted name for a local variable holding a translation bundle.
 */
export const BUNDLE_VARIABLE_NAME = 'trans';

/**
 * For each bundle method, the argument indices the string extractor reads
 * straight from the source and must therefore be static text.
 *
 * The `domain` argument of `dcnpgettext` is deliberately left out: it selects a
 * catalog at runtime, it is not extracted message text.
 */
export const STATIC_ARGUMENT_INDICES: Record<string, readonly number[]> = {
  // (msgid, ...args)
  __: [0],
  gettext: [0],
  // (msgid, msgid_plural, n, ...args)
  _n: [0, 1],
  ngettext: [0, 1],
  // (msgctxt, msgid, ...args)
  _p: [0, 1],
  pgettext: [0, 1],
  // (msgctxt, msgid, msgid_plural, n, ...args)
  _np: [0, 1, 2],
  npgettext: [0, 1, 2],
  // (domain, msgctxt, msgid, msgid_plural, n, ...args)
  dcnpgettext: [1, 2, 3]
};

/**
 * Returns true when a member expression names one of the exact targets the
 * string extractor recognizes as a translation bundle:
 * this.trans, this._trans, props.trans, this.props.trans.
 * See jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules
 */
export function isRecognizedBundleMember(
  node: TSESTree.MemberExpression
): boolean {
  if (node.computed || node.property.type !== 'Identifier') {
    return false;
  }
  const propertyName = node.property.name;
  const object = node.object;

  // this.trans / this._trans
  if (object.type === 'ThisExpression') {
    return BUNDLE_PROPERTY_NAMES.has(propertyName);
  }

  if (propertyName !== BUNDLE_VARIABLE_NAME) {
    return false;
  }

  // props.trans
  if (object.type === 'Identifier' && object.name === 'props') {
    return true;
  }

  // this.props.trans
  return (
    object.type === 'MemberExpression' &&
    !object.computed &&
    object.object.type === 'ThisExpression' &&
    object.property.type === 'Identifier' &&
    object.property.name === 'props'
  );
}

/**
 * Returns true if the node is a recognized JupyterLab translation bundle:
 * trans | this.trans | this._trans | props.trans | this.props.trans
 * See jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules
 */
export function isTransBundle(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') {
    return node.name === BUNDLE_VARIABLE_NAME;
  }
  if (node.type === 'MemberExpression') {
    return isRecognizedBundleMember(node);
  }
  return false;
}
