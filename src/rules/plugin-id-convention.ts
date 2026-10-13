/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TSESTree } from '@typescript-eslint/types';
import { createRule } from '../utils/create-rule';
import {
  getObjectProperties,
  getPluginId,
  getPluginObjectKind
} from '../utils/plugin-utils';
import { getTypeServices } from '../utils/type-services';
import { readPackageJson } from '../utils/package-json';

const MAX_PACKAGE_LEVELS = 12;

interface ExtensionPackageInfo {
  mtimeMs: number;
  name: string;
}

interface PackageManifestInfo {
  mtimeMs: number;
  name: string | null;
  isExtension: boolean;
}

const packageManifestCache = new Map<string, PackageManifestInfo>();
const packagePathCache = new Map<string, string | null>();

/**
 * Reads manifest metadata used to detect package boundaries.
 */
function readPackageManifest(packagePath: string): PackageManifestInfo | null {
  const packageJson = readPackageJson(packagePath);
  if (!packageJson) {
    return null;
  }

  const cached = packageManifestCache.get(packagePath);
  if (cached?.mtimeMs === packageJson.mtimeMs) {
    return cached;
  }

  const data = packageJson.data;
  const jupyterlab = data.jupyterlab;
  const name = typeof data.name === 'string' ? data.name : null;
  const isExtension =
    name !== null &&
    !!jupyterlab &&
    typeof jupyterlab === 'object' &&
    (('extension' in jupyterlab && Boolean(jupyterlab.extension)) ||
      ('mimeExtension' in jupyterlab && Boolean(jupyterlab.mimeExtension)));

  const info: PackageManifestInfo = {
    mtimeMs: packageJson.mtimeMs,
    name,
    isExtension
  };
  packageManifestCache.set(packagePath, info);
  return info;
}

/**
 * Reads the package name from a manifest that declares an extension entry.
 */
function readExtensionPackage(
  packagePath: string
): ExtensionPackageInfo | null {
  const manifest = readPackageManifest(packagePath);
  if (!manifest?.isExtension || manifest.name === null) {
    return null;
  }

  const info: ExtensionPackageInfo = {
    mtimeMs: manifest.mtimeMs,
    name: manifest.name
  };
  return info;
}

/**
 * Finds the nearest extension package manifest that governs a linted file.
 */
function getExtensionPackageName(fromFile: string): string | null {
  const start = path.dirname(path.resolve(fromFile));

  const cachedPath = packagePathCache.get(start);
  if (cachedPath !== undefined) {
    return cachedPath === null
      ? null
      : (readExtensionPackage(cachedPath)?.name ?? null);
  }

  const visited: string[] = [];
  let found: string | null = null;
  let directory = start;
  for (let level = 0; level < MAX_PACKAGE_LEVELS; level++) {
    visited.push(directory);
    const packagePath = path.join(directory, 'package.json');
    if (fs.existsSync(packagePath)) {
      found = packagePath;
      break;
    }
    if (fs.existsSync(path.join(directory, '.git'))) {
      break;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }

  for (const seen of visited) {
    packagePathCache.set(seen, found);
  }
  return found === null ? null : (readExtensionPackage(found)?.name ?? null);
}

const pluginIdConvention = createRule({
  name: 'plugin-id-convention',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure JupyterLab plugin IDs are prefixed with the extension package name',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/plugin-id-convention/'
    },
    messages: {
      mismatchedPrefix:
        'JupyterLab plugin ID "{{ pluginId }}" should start with "{{ packageName }}:" so extension-level configuration (disable, defer, lock) applies to it.',
      idEqualsPackageName:
        'JupyterLab plugin ID "{{ pluginId }}" is the package name alone; the convention is "{{ packageName }}:<plugin>".'
    },
    schema: [
      {
        type: 'object',
        properties: {
          reportIdEqualToPackageName: {
            type: 'boolean',
            default: false,
            description:
              'Also report a plugin whose ID is exactly the package name. Extension-level configuration matches such an ID in full, so it has no user impact, but it does not follow the `<package>:<plugin>` convention.'
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{ reportIdEqualToPackageName: false }],

  create(context, [options]) {
    const { checker, getTSNode } = getTypeServices(context);

    /**
     * Reports plugin IDs that do not use the owning extension package prefix.
     */
    function reportIfNeeded(node: TSESTree.ObjectExpression): void {
      // The shape and annotation checks are syntactic, so they run before the
      // ID is resolved: resolving may ask the type checker, and most object
      // literals with an `id` are commands, menu items or DOM nodes.
      const hasId = getObjectProperties(node).has('id');
      if (!hasId) {
        return;
      }

      const pluginKind = getPluginObjectKind(node, checker, getTSNode, {
        allowUntyped: true,
        matchMime: true
      });
      if (!pluginKind) {
        return;
      }

      const pluginId = getPluginId(
        node,
        context.sourceCode.getScope(node),
        checker,
        getTSNode
      );
      if (pluginId === null) {
        return;
      }

      const packageName = getExtensionPackageName(context.filename);
      if (!packageName || pluginId.startsWith(`${packageName}:`)) {
        return;
      }

      // An ID that is exactly the package name follows no convention, but
      // `disabledExtensions`, `deferredExtensions` and `lockedExtensions`
      // match it in full, so it is reported only when asked for.
      const isPackageName = pluginId === packageName;
      if (isPackageName && !options.reportIdEqualToPackageName) {
        return;
      }

      const idProperty = getObjectProperties(node).get('id');
      context.report({
        node: idProperty?.value ?? node,
        messageId: isPackageName ? 'idEqualsPackageName' : 'mismatchedPrefix',
        data: { pluginId, packageName }
      });
    }

    return {
      ObjectExpression: reportIfNeeded
    };
  }
});

export = pluginIdConvention;
