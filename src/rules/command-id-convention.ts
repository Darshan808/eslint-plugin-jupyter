/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/types';
import { ESLintUtils, ParserServices } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import { isAddCommandCall, resolveCommandId } from '../utils/commands';
import { createRule } from '../utils/create-rule';

const commandIdConvention = createRule({
  name: 'command-id-convention',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Ensure JupyterLab command IDs follow the "namespace:name" convention',
      url: 'https://eslint-plugin.readthedocs.io/en/latest/rules/command-id-convention/'
    },
    messages: {
      missingNamespace:
        'Command ID "{{ commandId }}" has no namespace; use the "namespace:name" form, e.g. "my-extension:{{ commandId }}".',
      emptySegment:
        'Command ID "{{ commandId }}" has an empty {{ segment }}; use the "namespace:name" form.'
    },
    schema: []
  },
  defaultOptions: [],

  create(context) {
    let services: ParserServices | null = null;
    let checker: ts.TypeChecker | null = null;

    try {
      services = ESLintUtils.getParserServices(context, true);
      checker = services.program ? services.program.getTypeChecker() : null;
    } catch {
      services = null;
    }

    const getTSNode = services
      ? (node: TSESTree.Node) => services?.esTreeNodeToTSNodeMap.get(node)
      : null;

    return {
      CallExpression(node) {
        // `addCommand(id, options)`: the arity filters out unrelated methods
        // that happen to share the name.
        if (!isAddCommandCall(node) || node.arguments.length < 2) {
          return;
        }

        const idArg = node.arguments[0];
        if (idArg.type === 'SpreadElement') {
          return;
        }

        const commandId = resolveCommandId(
          idArg,
          context.sourceCode,
          checker,
          getTSNode
        );
        if (commandId === null) {
          return;
        }

        // The namespace is everything before the first `:`, as in the
        // `namespace:name` form used by JupyterLab's own commands; the name
        // itself may contain further colons.
        const separator = commandId.indexOf(':');
        if (separator === -1) {
          context.report({
            node: idArg,
            messageId: 'missingNamespace',
            data: { commandId }
          });
          return;
        }

        const segment =
          separator === 0
            ? 'namespace'
            : separator === commandId.length - 1
              ? 'name'
              : null;
        if (segment) {
          context.report({
            node: idArg,
            messageId: 'emptySegment',
            data: { commandId, segment }
          });
        }
      }
    };
  }
});

export = commandIdConvention;
