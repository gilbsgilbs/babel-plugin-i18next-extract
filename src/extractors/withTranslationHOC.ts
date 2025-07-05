import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { CommentHint, getCommentHintForPath } from "../comments";
import { Config } from "../config";
import { ExtractedKey } from "../keys";

import {
  getFirstOrNull,
  evaluateIfConfident,
  referencesImport,
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
  let functionIdentifier: BabelCore.NodePath<BabelTypes.Identifier> | null =
    null;

  const ownId = path.get("id");
  if (!Array.isArray(ownId) && ownId.isIdentifier()) {
    // Normal function declaration, like: "function MyComponent(…)"
    functionIdentifier = ownId;
  } else if (path.parentPath.isVariableDeclarator()) {
    // Maybe a variable declaration, like:
    //   const MyComponent = (…) => …
    //   or const MyComponent = function(…) …
    const parentId = path.parentPath.get("id");
    if (!Array.isArray(parentId) && parentId.isIdentifier()) {
      functionIdentifier = parentId;
    }
  }

  if (!functionIdentifier) return null;

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
 * Try to find "t" in an object spread. Useful when looking for the "t" key
 * in a spread object. e.g. const {t} = props;
 *
 * @param path object pattern
 * @returns t identifier or null of it was not found in the object pattern.
 */
function findTFunctionIdentifierInObjectPattern(
  path: BabelCore.NodePath<BabelTypes.ObjectPattern>,
): BabelCore.NodePath<BabelTypes.Identifier> | null {
  const props = path.get("properties");

  for (const prop of props) {
    if (prop.isObjectProperty()) {
      const key = prop.get("key");
      if (!Array.isArray(key) && key.isIdentifier() && key.node.name === "t") {
        return key;
      }
    }
  }

  return null;
}

/**
 * Check whether a node path is the callee of a call expression.
 *
 * @param path the node to check.
 * @returns true if the path is the callee of a call expression.
 */
function isCallee(path: BabelCore.NodePath): path is BabelCore.NodePath & {
  parentPath: BabelCore.NodePath<BabelTypes.CallExpression>;
} {
  return !!(
    path.parentPath?.isCallExpression() &&
    path === path.parentPath.get("callee")
  );
}

/**
 * Find T function calls from a props assignment. Prop assignment can occur
 * in function parameters (i.e. "function Component(props)" or
 * "function Component({t})") or in a variable declarator (i.e.
 * "const props = …" or "const {t} = props").
 *
 * @param propsId identifier for the prop assignment. e.g. "props" or "{t}"
 * @returns Call expressions to t function.
 */
function findTFunctionCallsFromPropsAssignment(
  propsId: BabelCore.NodePath,
): BabelCore.NodePath<BabelTypes.CallExpression>[] {
  const tReferences = Array<BabelCore.NodePath>();

  const body = propsId.parentPath?.get("body");
  if (body === undefined || Array.isArray(body)) return [];
  const scope = body.scope;

  if (propsId.isObjectPattern()) {
    // got "function MyComponent({t, other, props})"
    // or "const {t, other, props} = this.props"
    // we want to find references to "t"
    const tFunctionIdentifier = findTFunctionIdentifierInObjectPattern(propsId);
    if (tFunctionIdentifier === null) return [];
    const tBinding = scope.bindings[tFunctionIdentifier.node.name];
    tReferences.push(...tBinding.referencePaths);
  } else if (propsId.isIdentifier()) {
    // got "function MyComponent(props)"
    // or "const props = this.props"
    // we want to find references to props.t
    const references = scope.bindings[propsId.node.name].referencePaths;
    for (const reference of references) {
      if (reference.parentPath?.isMemberExpression()) {
        const prop = reference.parentPath.get("property");
        if (
          !Array.isArray(prop) &&
          prop.isIdentifier() &&
          prop.node.name === "t"
        ) {
          tReferences.push(reference.parentPath);
        }
      }
    }
  }

  // We have candidates. Let's see if t references are actual calls to the t
  // function
  const tCalls = Array<BabelCore.NodePath<BabelTypes.CallExpression>>();
  for (const tCall of tReferences) {
    if (isCallee(tCall)) {
      tCalls.push(tCall.parentPath);
    }
  }

  return tCalls;
}

/**
 * Find all t function calls in a class component.
 * @param path node path to the class component.
 */
function findTFunctionCallsInClassComponent(
  path: BabelCore.NodePath<BabelTypes.ClassDeclaration>,
): BabelCore.NodePath<BabelTypes.CallExpression>[] {
  const result = Array<BabelCore.NodePath<BabelTypes.CallExpression>>();

  const thisVisitor: BabelCore.Visitor = {
    ThisExpression(path) {
      if (!path.parentPath.isMemberExpression()) return;

      const propProperty = path.parentPath.get("property");
      if (Array.isArray(propProperty) || !propProperty.isIdentifier()) return;
      if (propProperty.node.name !== "props") return;

      // Ok, this is interesting, we have something with "this.props"

      if (path.parentPath.parentPath.isMemberExpression()) {
        // We have something in the form "this.props.xxxx".

        const tIdentifier = path.parentPath.parentPath.get("property");
        if (Array.isArray(tIdentifier) || !tIdentifier.isIdentifier()) return;
        if (tIdentifier.node.name !== "t") return;

        // We have something in the form "this.props.t". Let's see if it's an
        // actual function call or an assignment.
        const tExpression = path.parentPath.parentPath;
        if (isCallee(tExpression)) {
          // Simple case. Direct call to "this.props.t()"
          result.push(tExpression.parentPath);
        } else if (tExpression.parentPath.isVariableDeclarator()) {
          // Hard case. const t = this.props.t;
          // Let's loop through all references to t.
          const id = tExpression.parentPath.get("id");
          if (!id.isIdentifier()) return;
          for (const reference of id.scope.bindings[id.node.name]
            .referencePaths) {
            if (isCallee(reference)) {
              result.push(reference.parentPath);
            }
          }
        }
      } else if (path.parentPath.parentPath.isVariableDeclarator()) {
        // We have something in the form "const props = this.props"
        // Or "const {t} = this.props"
        const id = path.parentPath.parentPath.get("id");
        result.push(...findTFunctionCallsFromPropsAssignment(id));
      }
    },
  };
  path.traverse(thisVisitor);

  return result;
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
    tCalls = findTFunctionCallsInClassComponent(path);
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
