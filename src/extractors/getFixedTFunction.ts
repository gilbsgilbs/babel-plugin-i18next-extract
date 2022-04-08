import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { CommentHint, getCommentHintForPath } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import {
  getFirstOrNull,
  evaluateIfConfident,
  referencesChildIdentifier,
} from './commons';
import extractTFunction from './tFunction';

/**
 * Check whether a given CallExpression path is a call to `getFixedT()`
 *    function.
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to
 *   `getFixedT`
 */
function isGetFixedTFunction(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
): boolean {
  const callee = path.get('callee');

  return referencesChildIdentifier(
    callee,
    config.i18nextInstanceNames,
    'getFixedT',
  );
}

/**
 * Parse `getFixedT()` getter to extract all its translation keys and
 * options (see https://www.i18next.com/overview/api#getfixedt)
 * @param path: useTranslation call node path.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractGetFixedTFunction(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (!isGetFixedTFunction(path, config)) return [];

  let ns: string | null;
  const nsCommentHint = getCommentHintForPath(path, 'NAMESPACE', commentHints);
  if (nsCommentHint) {
    // We got a comment hint, take its value as namespace.
    ns = nsCommentHint.value;
  } else {
    // Otherwise, try to get namespace from arguments.
    const namespaceArgument = path.get('arguments')[1];
    ns = getFirstOrNull(evaluateIfConfident(namespaceArgument));
  }

  const parentPath = path.parentPath;
  if (!parentPath.isVariableDeclarator()) return [];

  const id = parentPath.get('id');
  if (!id.isIdentifier()) return [];

  const tBinding = id.scope.bindings[id.node.name];
  if (!tBinding) return [];

  let keys = Array<ExtractedKey>();
  for (const reference of tBinding.referencePaths) {
    if (
      reference.parentPath?.isCallExpression() &&
      reference.parentPath.get('callee') === reference
    ) {
      keys = [
        ...keys,
        ...extractTFunction(
          reference.parentPath,
          config,
          commentHints,
          true,
        ).map((k) => ({
          // Add namespace if it was not explicitely set in t() call.
          ...k,
          parsedOptions: {
            ...k.parsedOptions,
            ns: k.parsedOptions.ns || ns,
          },
        })),
      ];
    }
  }

  return keys.map((k) => ({
    ...k,
    sourceNodes: [path.node, ...k.sourceNodes],
    extractorName: extractGetFixedTFunction.name,
  }));
}
