import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { CommentHint, getCommentHintForPath } from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import {
  getFirstOrNull,
  findJSXAttributeByName,
  evaluateIfConfident,
  referencesImport,
} from "./commons";
import extractTFunction from "./tFunction";

/**
 * Check whether a given JSXElement is a Translation render prop.
 * @param path: node path to check
 * @returns true if the given element is indeed a `Translation` render prop.
 */
function isTranslationRenderProp(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): boolean {
  const openingElement = path.get("openingElement");
  return referencesImport(
    openingElement.get("name"),
    "react-i18next",
    "Translation",
  );
}

/**
 * Parse `Translation` render prop to extract all its translation keys and
 * options.
 *
 * @param path: node path of Translation JSX element.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractTranslationRenderProp(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (!isTranslationRenderProp(path)) return [];

  let ns: string | null;

  const nsCommentHint = getCommentHintForPath(path, "NAMESPACE", commentHints);
  if (nsCommentHint) {
    // We got a comment hint, take its value as namespace.
    ns = nsCommentHint.value;
  } else {
    // Try to parse ns property
    const nsAttr = findJSXAttributeByName(path, "ns");
    if (nsAttr) {
      let value: BabelCore.NodePath<BabelTypes.Node | null | undefined> =
        nsAttr.get("value");
      if (value.isJSXExpressionContainer()) value = value.get("expression");
      ns = getFirstOrNull(evaluateIfConfident(value));
    }
  }

  // We expect at least "<Translation>{(t) => …}</Translation>
  const expressionContainer = path
    .get("children")
    .filter((p) => p.isJSXExpressionContainer())[0];
  if (!expressionContainer || !expressionContainer.isJSXExpressionContainer())
    return [];
  const expression = expressionContainer.get("expression");
  if (!expression.isArrowFunctionExpression()) return [];

  const tParam = expression.get("params")[0];
  if (!tParam) return [];

  const tBinding = tParam.scope.bindings["t"];
  if (!tBinding) return [];

  let keys = Array<ExtractedKey>();
  for (const reference of tBinding.referencePaths) {
    if (
      reference.parentPath?.isCallExpression() &&
      reference.parentPath.get("callee") === reference
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
    extractorName: extractTranslationRenderProp.name,
  }));
}
