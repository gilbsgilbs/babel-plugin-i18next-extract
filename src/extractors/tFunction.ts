import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import {
  ExtractionError,
  getFirstOrNull,
  evaluateIfConfident,
  findKeyInObjectExpression,
  parseI18NextOptionsFromCommentHints,
} from './commons';
import {
  COMMENT_HINTS_KEYWORDS,
  getCommentHintForPath,
  CommentHint,
} from '../comments';
import { ExtractedKey } from '../keys';
import { Config } from '../config';

/**
 * Check whether a given CallExpression path is a global call to the `t`
 * function.
 *
 * @param path: node path to check
 * @param config: plugin configuration
 * @returns true if the given call expression is indeed a call to i18next.t.
 */
function isSimpleTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
): boolean {
  const callee = path.get('callee');

  if (!callee.isIdentifier()) return false;

  return config.tFunctionNames.includes(callee.node.name);
}

/**
 * Parse options of a `t(…)` call.
 * @param path: NodePath representing the second argument of the `t()` call
 *   (i.e. the i18next options)
 * @returns an object indicating whether the parsed options have context
 *   and/or count.
 */
function parseTCallOptions(
  path: BabelCore.NodePath | undefined,
): ExtractedKey['parsedOptions'] {
  const res: ExtractedKey['parsedOptions'] = {
    contexts: false,
    hasCount: false,
    ns: null,
  };

  if (!path) return res;

  // Try brutal evaluation first.
  const optsEvaluation = evaluateIfConfident(path);
  if (optsEvaluation !== null) {
    res.contexts = 'context' in optsEvaluation;
    res.hasCount = 'count' in optsEvaluation;

    const evaluatedNamespace = optsEvaluation['ns'];
    res.ns = getFirstOrNull(evaluatedNamespace);
  } else if (path.isObjectExpression()) {
    // It didn't work. Let's try to parse object expression keys.
    res.contexts = findKeyInObjectExpression(path, 'context') !== null;
    res.hasCount = findKeyInObjectExpression(path, 'count') !== null;

    const nsNode = findKeyInObjectExpression(path, 'ns');
    const nsNodeEvaluation = evaluateIfConfident(nsNode);
    res.ns = getFirstOrNull(nsNodeEvaluation);
  }

  return res;
}

/**
 * Given a call to the `t()` function, find the key and the options.
 *
 * @param path NodePath of the `t()` call.
 * @param commentHints parsed comment hints
 * @throws ExtractionError when the extraction failed for the `t` call.
 */
function extractTCall(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  commentHints: CommentHint[],
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

  return {
    key: keyEvaluation,
    parsedOptions: {
      ...parseTCallOptions(args[1]),
      ...parseI18NextOptionsFromCommentHints(path, commentHints),
    },
    nodePath: path,
  };
}

/**
 * Parse a call expression (likely a call to a `t` function) to find its
 * translation keys and i18next options.
 *
 * @param path: node path of the t function call.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
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
  return [extractTCall(path, commentHints)];
}
