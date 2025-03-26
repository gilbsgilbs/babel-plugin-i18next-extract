import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { CommentHint, getCommentHintForPath } from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import { findTFunctionCallsInClassComponent } from "./commons";
import extractTFunction from "./tFunction";

/**
 * Parse function or class declaration (likely components) to find whether
 * they are wrapped with "withTranslation()" HOC, and if so, extract all the
 * translations that come from the "t" function injected in the component
 * properties.
 *
 * @param path node path to the component
 * @param config plugin configuration
 * @param commentHints parsed comment hints
 */
export default function extractGetClassMember(
  path: BabelCore.NodePath<BabelTypes.Function | BabelTypes.ClassDeclaration>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (!path.isClassDeclaration()) {
    return [];
  }
  const tCalls = config.i18nextInstanceNames.reduce(
    (accumulator, instanceName) => [
      ...accumulator,
      ...findTFunctionCallsInClassComponent(path, instanceName),
    ],
    [] as BabelCore.NodePath<BabelTypes.CallExpression>[],
  );

  // Extract namespace
  let ns: string | null;
  const nsCommentHint = getCommentHintForPath(path, "NAMESPACE", commentHints);
  if (nsCommentHint) {
    // We got a comment hint, take its value as namespace.
    ns = nsCommentHint.value;
  } else {
    // TODO - extract from constructor parameter with reflection
  }

  let keys = Array<ExtractedKey>();
  for (const tCall of tCalls) {
    keys = [
      ...keys,
      ...extractTFunction(tCall, config, commentHints, true).map((k) => ({
        // Add namespace if it was not explicitely set in t() call.
        ...k,
        parsedOptions: {
          ...k.parsedOptions,
          ns: k.parsedOptions.ns || ns,
        },
      })),
    ];
  }

  return keys.map((k) => ({
    ...k,
    sourceNodes: [path.node, ...k.sourceNodes],
    extractorName: extractGetClassMember.name,
  }));
}
