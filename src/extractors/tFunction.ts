import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import {
  ExtractionError,
  getFirstOrNull,
  evaluateIfConfident,
  findKeyInObjectExpression,
} from './commons';
import {
  COMMENT_HINTS_KEYWORDS,
  getCommentHintForPath,
  CommentHint,
} from '../comments';
import { ExtractedKey } from '../keys';
import { Config } from '../config';

/**
 * Check whether a given CallExpression path is a global call to `i18next.t`
 * function.
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to i18next.t.
 */
function isSimpleTCall(
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
 * Parse options of a `i18next.t(…)` call.
 * @param path: NodePath representing the second argument of the `t()` call
 *   (i.e. the i18next options)
 * @returns an object indicating whether the parsed options have context
 *   and/or count.
 */
function parseTCallOptions(
  path?: BabelCore.NodePath,
): ExtractedKey['parsedOptions'] {
  let hasContext = false;
  let hasCount = false;
  let ns: string | null = null;

  if (!path) return { hasContext, hasCount, ns };

  // Try brutal evaluation first.
  const optsEvaluation = evaluateIfConfident(path);
  if (optsEvaluation !== null) {
    hasContext = 'context' in optsEvaluation;
    hasCount = 'count' in optsEvaluation;

    const evaluatedNamespace = optsEvaluation['ns'];
    ns = getFirstOrNull(evaluatedNamespace);

    return { hasContext, hasCount, ns };
  }

  // It didn't work. Let's try to parse object expression keys.
  if (path.isObjectExpression()) {
    hasContext = findKeyInObjectExpression(path, 'context') !== null;
    hasCount = findKeyInObjectExpression(path, 'count') !== null;

    const nsNode = findKeyInObjectExpression(path, 'ns');
    const nsNodeEvaluation = evaluateIfConfident(nsNode);
    ns = getFirstOrNull(nsNodeEvaluation);

    return { hasContext, hasCount, ns };
  }

  throw new ExtractionError(
    "Couldn't evaluate i18next options. Please, provide options as an object expression.",
  );
}

/**
 * Given a call to `i18next.t`, find the key and the options.
 *
 * @param path NodePath of the `i18next.t` call.
 * @throws ExtractionError when the extraction failed for the `t` call.
 */
function extractTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
): ExtractedKey {
  const args = path.get('arguments');
  const keyEvaluation = evaluateIfConfident(args[0]);

  if (typeof keyEvaluation !== 'string') {
    throw new ExtractionError(
      `Couldn't evaluate i18next key. You should either make the key ` +
        `evaluable or skip the line using a skip comment (/* ` +
        `${COMMENT_HINTS_KEYWORDS.DISABLE.LINE} */ or /* ` +
        `${COMMENT_HINTS_KEYWORDS.DISABLE.NEXT_LINE} */).`,
    );
  }

  const parsedOptions = parseTCallOptions(args[1]);
  return {
    key: keyEvaluation,
    parsedOptions,
    nodePath: path,
  };
}

/**
 * Parse a call expression (likely `i18next.t`) to find its translation keys
 * and i18next options.
 *
 * @param path: node path of the t function call.
 * @param config: plugin configuration
 * @param disableExtractionIntervals: interval of lines where extraction is disabled
 * @param skipCheck: set to true if you know that the call expression arguments
 *   already is a `t` function.
 */
export default function extractTFunction(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
  skipCheck: boolean = false,
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (!skipCheck && !isSimpleTCall(path, config)) return [];
  return [extractTCall(path)];
}
