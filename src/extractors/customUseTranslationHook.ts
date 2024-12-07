import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { getCommentHintForPath, CommentHint } from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import { isCustomImportedNode } from "./commons";
import extractUseTranslationHook from "./useTranslationHook";

/**
 * Extract custom useTranslation hooks.
 *
 * @param path: node path of potential custom useTranslation hook calls.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractCustomUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (getCommentHintForPath(path, "DISABLE", commentHints)) return [];
  if (
    !isCustomImportedNode(
      config.cache.absoluteCustomHooks,
      path,
      path.get("callee"),
    )
  ) {
    return [];
  }
  return extractUseTranslationHook(path, config, commentHints, true);
}
