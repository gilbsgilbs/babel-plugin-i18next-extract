import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { CommentHint, getCommentHintForPath } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import {
  getFirstOrNull,
  evaluateIfConfident,
  referencesImport,
  getAliasedTBindingName,
} from './commons';
import extractTFunction from './tFunction';

/**
 * Check whether a given CallExpression path is a call to `useTranslation` hook.
 * @param path: node path to check
 * @returns true if the given call expression is indeed a call to
 *   `useTranslation`
 */
function isUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
): boolean {
  const callee = path.get('callee');
  return referencesImport(callee, 'react-i18next', 'useTranslation');
}

/**
 * Parse `useTranslation()` hook to extract all its translation keys and
 * options.
 * @param path: useTranslation call node path.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
  skipCheck = false,
): ExtractedKey[] {
  if (!skipCheck && !isUseTranslationHook(path)) return [];

  let ns: string | null;
  const nsCommentHint = getCommentHintForPath(path, 'NAMESPACE', commentHints);
  if (nsCommentHint) {
    // We got a comment hint, take its value as namespace.
    ns = nsCommentHint.value;
  } else {
    // Otherwise, try to get namespace from arguments.
    const namespaceArgument = path.get('arguments')[0];
    ns = getFirstOrNull(evaluateIfConfident(namespaceArgument));
  }

  const parentPath = path.parentPath;
  if (!parentPath.isVariableDeclarator()) return [];

  const id = parentPath.get('id');

  const tBindingName = getAliasedTBindingName(id, config.tFunctionNames);
  if (!tBindingName) return [];

  const tBinding = id.scope.bindings[tBindingName];
  if (!tBinding) return [];

  let keyPrefix: string | null = null;

  const optionsArgument = path.get('arguments')[1];
  const options = getFirstOrNull(evaluateIfConfident(optionsArgument));

  if (options) {
    keyPrefix = options.keyPrefix || keyPrefix;
  }

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
            keyPrefix: k.parsedOptions.keyPrefix || keyPrefix,
            ns: k.parsedOptions.ns || ns,
          },
        })),
      ];
    }
  }

  return keys.map((k) => ({
    ...k,
    sourceNodes: [path.node, ...k.sourceNodes],
    extractorName: extractUseTranslationHook.name,
  }));
}
