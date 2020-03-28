import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { getCommentHintForPath, CommentHint } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import { referencesChildIdentifier } from './commons';
import extractTFunction from './tFunction';

/**
 * Check whether a given CallExpression path is a global call to `i18next.t`
 * function.
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to i18next.t.
 */
function isI18nextTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
): boolean {
  const callee = path.get('callee');

  return referencesChildIdentifier(callee, config.i18nextInstanceNames, 't');
}

/**
 * Parse a call expression (likely `i18next.t`) to find its translation keys
 * and i18next options.
 *
 * @param path: node path of the t function call.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 * @param skipCheck: set to true if you know that the call expression arguments
 *   already is a `t` function.
 */
export default function extractI18nextInstance(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (!isI18nextTCall(path, config)) return [];
  return extractTFunction(path, config, commentHints, true).map((k) => ({
    ...k,
    sourceNodes: [path.node, ...k.sourceNodes],
    extractorName: extractI18nextInstance.name,
  }));
}
