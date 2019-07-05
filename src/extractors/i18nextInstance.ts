import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import { getCommentHintForPath, CommentHint } from '../comments';
import { ExtractedKey } from '../keys';
import { Config } from '../config';
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

  if (!callee.isMemberExpression()) return false;

  const obj = callee.get('object');
  if (!obj.isIdentifier()) return false;

  const prop = callee.get('property');
  if (Array.isArray(prop) || !prop.isIdentifier()) return false;

  return (
    config.i18nextInstanceNames.includes(obj.node.name) &&
    prop.node.name === 't'
  );
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
  return extractTFunction(path, config, commentHints, true).map(k => ({
    ...k,
    sourceNodePaths: [path, ...k.sourceNodePaths],
    extractorName: extractI18nextInstance.name,
  }));
}
