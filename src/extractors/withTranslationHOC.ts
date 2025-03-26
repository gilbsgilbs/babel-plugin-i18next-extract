import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { CommentHint, getCommentHintForPath } from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import {
  getFirstOrNull,
  evaluateIfConfident,
  referencesImport,
  findTFunctionCallsInClassComponent,
  findTFunctionCallsFromPropsAssignment,
} from "./commons";
import extractTFunction from "./tFunction";

/**
 * Check whether a given node is a withTranslation call expression.
 *
 * @param path Node path to check
 * @returns true if the given node is an HOC call expression.
 */
function isWithTranslationHOCCallExpression(
  path: BabelCore.NodePath,
): path is BabelCore.NodePath<BabelTypes.CallExpression> {
  return (
    path.isCallExpression() &&
    referencesImport(path.get("callee"), "react-i18next", "withTranslation")
  );
}

/**
 * If the given node is wrapped in a withTranslation call expression,
 * then return the call expression.
 *
 * @param path node path that is suspected to be part of a withTranslation call expression.
 * @returns withTranslation call expression if found, else null
 */
function findWithTranslationHOCCallExpressionInParents(
  path: BabelCore.NodePath<BabelTypes.Node>,
): BabelCore.NodePath<BabelTypes.CallExpression> | null {
  const callExpr = path.findParent((parentPath) => {
    if (!parentPath.isCallExpression()) return false;
    const callee = parentPath.get("callee");
    return isWithTranslationHOCCallExpression(callee);
  });

  if (callExpr === null) {
    return null;
  }

  const callee = callExpr.get("callee");
  if (Array.isArray(callee) || !callee.isCallExpression()) return null;

  return callee;
}

/**
 * Just like findWithTranslationHOCCallExpressionInParents, finds a withTranslation call
 * expression, but expects the callExpression to be curried in a "compose" function.
 *
 * e.g. compose(connect(), withTranslation())(MyComponent)
 *
 * @param path node path that is suspected to be part of a composed withTranslation call
 *   expression.
 * @returns withTranslation call expression if found, else null
 */
function findWithTranslationHOCCallExpressionInCompose(
  path: BabelCore.NodePath<BabelTypes.Node>,
): BabelCore.NodePath<BabelTypes.CallExpression> | null {
  const composeFunctionNames = ["compose", "flow", "flowRight"];

  let currentPath = path.parentPath;
  let withTranslationCallExpr: BabelCore.NodePath<BabelTypes.CallExpression> | null =
    null;

  while (currentPath?.isCallExpression()) {
    if (withTranslationCallExpr === null) {
      const args: BabelCore.NodePath[] = currentPath.get("arguments");
      withTranslationCallExpr =
        args.find(isWithTranslationHOCCallExpression) || null;
    }

    let callee: BabelCore.NodePath<
      | BabelTypes.V8IntrinsicIdentifier
      | BabelTypes.Expression
      | BabelTypes.PrivateName
    > = currentPath.get("callee");
    if (callee.isMemberExpression()) {
      // If we have a member expression, we take the right operand
      // e.g. _.compose
      const result = callee.get("property");
      if (!Array.isArray(result)) {
        callee = result;
      }
    }
    if (
      callee.isIdentifier() &&
      composeFunctionNames.includes(callee.node.name)
    ) {
      return withTranslationCallExpr;
    }
    currentPath = callee;
  }

  return null;
}

/**
 * Find whether a given function or class is wrapped with "withTranslation" HOC
 * somewhere.
 * @param path Function or class declaration node path.
 * @returns "withTranslation()()" call expression if found. Else null.
 */
function findWithTranslationHOCCallExpression(
  path: BabelCore.NodePath<BabelTypes.Function | BabelTypes.ClassDeclaration>,
): BabelCore.NodePath<BabelTypes.CallExpression> | null {
  let functionIdentifier = path.get("id");

  if (
    !Array.isArray(functionIdentifier) &&
    !functionIdentifier.isIdentifier() &&
    path.parentPath.isVariableDeclarator()
  ) {
    // It doesn't look like "function MyComponent(…)"
    // but could be "const MyComponent = (…) => …" or "const MyComponent = function(…) { … }"
    functionIdentifier = path.parentPath.get("id");
  }

  if (Array.isArray(functionIdentifier) || !functionIdentifier.isIdentifier())
    return null;

  const bindings = path.parentPath.scope.bindings[functionIdentifier.node.name];

  // Likely an anonymous function not in a normal scope.
  // e.g. "['foo', function myFunction() { return 'foo'; }]"
  // Let's just ignore such case.
  if (!bindings) return null;

  // Try to find a withTranslation() call in parent scope
  for (const refPath of bindings.referencePaths) {
    const callee =
      findWithTranslationHOCCallExpressionInParents(refPath) ||
      findWithTranslationHOCCallExpressionInCompose(refPath);
    if (callee !== null) {
      return callee;
    }
  }

  return null;
}

/**
 * Find t function calls in a function component.
 * @param path node path to the function component.
 */
function findTFunctionCallsInFunctionComponent(
  path: BabelCore.NodePath<BabelTypes.Function>,
): BabelCore.NodePath<BabelTypes.CallExpression>[] {
  const propsParam = path.get("params")[0];
  if (propsParam === undefined) return [];
  return findTFunctionCallsFromPropsAssignment(propsParam);
}

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
export default function extractWithTranslationHOC(
  path: BabelCore.NodePath<BabelTypes.Function | BabelTypes.ClassDeclaration>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  // Detect if this component is wrapped with withTranslation() somewhere
  const withTranslationCallExpression =
    findWithTranslationHOCCallExpression(path);
  if (withTranslationCallExpression === null) return [];

  let tCalls: BabelCore.NodePath<BabelTypes.CallExpression>[];
  if (path.isClassDeclaration()) {
    tCalls = findTFunctionCallsInClassComponent(path, "props");
  } else {
    tCalls = findTFunctionCallsInFunctionComponent(
      path as BabelCore.NodePath<BabelTypes.Function>,
    );
  }

  // Extract namespace
  let ns: string | null;
  const nsCommentHint = getCommentHintForPath(
    withTranslationCallExpression,
    "NAMESPACE",
    commentHints,
  );
  if (nsCommentHint) {
    // We got a comment hint, take its value as namespace.
    ns = nsCommentHint.value;
  } else {
    // Otherwise, try to get namespace from arguments.
    const namespaceArgument = withTranslationCallExpression.get("arguments")[0];
    ns = getFirstOrNull(evaluateIfConfident(namespaceArgument));
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
    extractorName: extractWithTranslationHOC.name,
  }));
}
