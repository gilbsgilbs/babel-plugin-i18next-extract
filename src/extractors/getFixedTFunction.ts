import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import extractTFunction from './tFunction';
import { ExtractedKey } from '../keys';
import { Config } from '../config';
import { getFirstOrNull, evaluateIfConfident } from './commons';
import { CommentHint, getCommentHintForPath } from '../comments';

/**
 * Check whether a given CallExpression path is a call to `useTranslation` hook.
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to
 *   `useTranslation`
 */
function isGetFixedTFunction(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
): boolean {
  const callee = path.get('callee');

  if (!callee.isMemberExpression()) return false;

  const obj = callee.get('object');
  if (!obj.isIdentifier()) return false;

  const prop = callee.get('property');
  if (Array.isArray(prop) || !prop.isIdentifier()) return false;

  return (
    config.i18nextInstanceNames.includes(obj.node.name) &&
    prop.node.name === 'getFixedT'
  );
}

/**
 * Parse `useTranslation()` hook to extract all its translation keys and
 * options.
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

  const tBinding = id.scope.bindings['t'];
  if (!tBinding) return [];

  let keys = Array<ExtractedKey>();
  for (const reference of tBinding.referencePaths) {
    if (
      reference.parentPath.isCallExpression() &&
      reference.parentPath.get('callee') === reference
    ) {
      keys = [
        ...keys,
        ...extractTFunction(
          reference.parentPath,
          config,
          commentHints,
          true,
        ).map(k => ({
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

  return keys.map(k => ({
    ...k,
    sourceNodes: [path.node, ...k.sourceNodes],
    extractorName: extractGetFixedTFunction.name,
  }));
}
