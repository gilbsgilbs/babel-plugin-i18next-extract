import { dirname, isAbsolute, relative, sep } from "path";

import * as BabelCore from "@babel/core";
import * as BabelTypes from "@babel/types";

import { CommentHint, getCommentHintForPath } from "../comments";
import { ExtractedKey } from "../keys";

/**
 * Error thrown in case extraction of a node failed.
 */
export class ExtractionError extends Error {
  nodePath: BabelCore.NodePath;

  constructor(message: string, node: BabelCore.NodePath) {
    super(message);
    this.nodePath = node;
  }
}

/**
 * Given a value, if the value is an array, return the first
 * item of the array. Otherwise, return the value.
 *
 * This is mainly useful to parse namespaces which can be strings
 * as well as array of strings.
 */
export function getFirstOrNull<T>(val: T | null | T[]): T | null {
  if (Array.isArray(val)) val = val[0];
  return val === undefined ? null : val;
}

/**
 * Given comment hints and a path, infer every I18NextOption we can from the comment hints.
 * @param path path on which the comment hints should apply
 * @param commentHints parsed comment hints
 * @returns every parsed option that could be infered.
 */
export function parseI18NextOptionsFromCommentHints(
  path: BabelCore.NodePath,
  commentHints: CommentHint[],
): Partial<ExtractedKey["parsedOptions"]> {
  const nsCommentHint = getCommentHintForPath(path, "NAMESPACE", commentHints);
  const contextCommentHint = getCommentHintForPath(
    path,
    "CONTEXT",
    commentHints,
  );
  const pluralCommentHint = getCommentHintForPath(path, "PLURAL", commentHints);
  const res: Partial<ExtractedKey["parsedOptions"]> = {};

  if (nsCommentHint !== null) {
    res.ns = nsCommentHint.value;
  }
  if (contextCommentHint !== null) {
    if (["", "enable"].includes(contextCommentHint.value)) {
      res.contexts = true;
    } else if (contextCommentHint.value === "disable") {
      res.contexts = false;
    } else {
      try {
        const val = JSON.parse(contextCommentHint.value);
        if (Array.isArray(val)) res.contexts = val;
        else res.contexts = [contextCommentHint.value];
      } catch {
        res.contexts = [contextCommentHint.value];
      }
    }
  }
  if (pluralCommentHint !== null) {
    if (pluralCommentHint.value === "disable") {
      res.hasCount = false;
    } else {
      res.hasCount = true;
    }
  }
  return res;
}

/**
 * Improved version of BabelCore `referencesImport` function that also tries to detect wildcard
 * imports.
 */
export function referencesImport(
  nodePath: BabelCore.NodePath,
  moduleSource: string,
  importName: string,
): boolean {
  if (nodePath.referencesImport(moduleSource, importName)) return true;

  if (nodePath.isMemberExpression() || nodePath.isJSXMemberExpression()) {
    const obj = nodePath.get("object");
    const prop = nodePath.get("property");
    if (
      Array.isArray(obj) ||
      Array.isArray(prop) ||
      (!prop.isIdentifier() && !prop.isJSXIdentifier())
    )
      return false;
    return (
      obj.referencesImport(moduleSource, "*") && prop.node.name === importName
    );
  }
  return false;
}

/**
 * Whether a class-instance function call expression matches a known method
 * @param nodePath: node path to evaluate
 * @param parentNames: list for any class-instance names to match
 * @param childName specific function from parent module to match
 */
export function referencesChildIdentifier(
  nodePath: BabelCore.NodePath,
  parentNames: string[],
  childName: string,
): boolean {
  if (!nodePath.isMemberExpression()) return false;

  const obj = nodePath.get("object");
  if (!obj.isIdentifier()) return false;

  const prop = nodePath.get("property");
  if (Array.isArray(prop) || !prop.isIdentifier()) return false;

  return parentNames.includes(obj.node.name) && prop.node.name === childName;
}

/**
 * Evaluates a node path if it can be evaluated with confidence.
 *
 * @param path: node path to evaluate
 * @returns null if the node path couldn't be evaluated
 */
export function evaluateIfConfident(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path?: BabelCore.NodePath<any> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!path || !path.node) {
    return null;
  }

  const evaluation = path.evaluate();

  if (evaluation.confident) {
    return evaluation.value;
  }

  return null;
}

/**
 * Generator that iterates on all keys in an object expression.
 * @param path the node path of the object expression
 * @param key the key to find in the object expression.
 * @yields [evaluated key, node path of the object expression property]
 */
export function* iterateObjectExpression(
  path: BabelCore.NodePath<BabelTypes.ObjectExpression>,
): IterableIterator<
  [string, BabelCore.NodePath<BabelTypes.ObjectExpression["properties"][0]>]
> {
  const properties = path.get("properties");

  for (const prop of properties) {
    const keyPath = prop.get("key");

    if (Array.isArray(keyPath)) continue;

    let keyEvaluation = null;
    if (keyPath.isLiteral()) {
      keyEvaluation = evaluateIfConfident(keyPath);
    } else if (keyPath.isIdentifier()) {
      keyEvaluation = keyPath.node.name;
    } else {
      continue;
    }

    yield [keyEvaluation, prop];
  }
}

/**
 * Try to find a key in an object expression.
 * @param path the node path of the object expression
 * @param key the key to find in the object expression.
 * @returns the corresponding node or null if it wasn't found
 */
export function findKeyInObjectExpression(
  path: BabelCore.NodePath<BabelTypes.ObjectExpression>,
  key: string,
): BabelCore.NodePath<BabelTypes.ObjectExpression["properties"][0]> | null {
  for (const [keyEvaluation, prop] of iterateObjectExpression(path)) {
    if (keyEvaluation === key) return prop;
  }

  return null;
}

/**
 * Find a JSX attribute given its name.
 * @param path path of the jsx attribute
 * @param name name of the attribute to look for
 * @return The JSX attribute corresponding to the given name, or null if no
 *   attribute with this name could be found.
 */
export function findJSXAttributeByName(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  name: string,
): BabelCore.NodePath<BabelTypes.JSXAttribute> | null {
  const openingElement = path.get("openingElement");
  const attributes = openingElement.get("attributes");

  for (const attribute of attributes) {
    if (!attribute.isJSXAttribute()) continue;

    const attributeName = attribute.get("name");
    if (!attributeName.isJSXIdentifier()) continue;

    if (name === attributeName.node.name) return attribute;
  }

  return null;
}

/**
 * Attempt to find the latest assigned value for a given identifier.
 *
 * For instance, given the following code:
 *   const foo = 'bar';
 *   console.log(foo);
 *
 * resolveIdentifier(fooNodePath) should return the 'bar' literal.
 *
 * Obviously, this will only work in quite simple cases.
 *
 * @param nodePath: node path to resolve
 * @return the resolved expression or null if it could not be resolved.
 */
export function resolveIdentifier(
  nodePath: BabelCore.NodePath<BabelTypes.Identifier>,
): BabelCore.NodePath<BabelTypes.Expression> | null {
  const bindings = nodePath.scope.bindings[nodePath.node.name];
  if (!bindings) return null;

  const declarationExpressions = [
    ...(bindings.path.isVariableDeclarator()
      ? [bindings.path.get("init")]
      : []),
    ...bindings.constantViolations
      .filter((p) => p.isAssignmentExpression())
      .map((p) => p.get("right")),
  ];
  if (declarationExpressions.length === 0) return null;

  const latestDeclarator =
    declarationExpressions[declarationExpressions.length - 1];
  if (Array.isArray(latestDeclarator)) return null;
  if (!latestDeclarator.isExpression()) return null;

  return latestDeclarator;
}

/**
 * Check whether a given node is a custom import.
 *
 * @param absoluteNodePaths: list of possible custom nodes, with their source
 *   modules and import names.
 * @param path: node path to check
 * @param name: node name to check
 * @returns true if the given node is a match.
 */
export function isCustomImportedNode(
  absoluteNodePaths: readonly [string, string][],
  path: BabelCore.NodePath,
  name: BabelCore.NodePath,
): boolean {
  return absoluteNodePaths.some(([sourceModule, importName]): boolean => {
    if (isAbsolute(sourceModule)) {
      let relativeSourceModulePath = relative(
        dirname(path.state.filename),
        sourceModule,
      );
      if (!relativeSourceModulePath.startsWith(".")) {
        relativeSourceModulePath = "." + sep + relativeSourceModulePath;
      }

      // Absolute path to the source module, let's try a relative path first.
      if (referencesImport(name, relativeSourceModulePath, importName)) {
        return true;
      }
    }
    return referencesImport(name, sourceModule, importName);
  });
}

/**
 * Find the aliased t function name (after being destructured).
 * If the destructure `t` function is not aliased, will return the identifier name as it is.
 *
 * For instance, given the following code:
 *   const { t: tCommon } = useTranslation('common');
 *   return <p>{tCommon('key1')}<p>
 *
 *   // or with pluginOptions.tFunctionNames = ["myT"]
 *   const { myT: tCommon } = useTranslation('common');
 *   return <p>{tCommon('key1')}<p>
 *
 * getAliasedTBindingName(nodePath) should return 'tCommon' instead of t or myT
 *
 * @param nodePath: node path to resolve
 * @param tFunctionNames: possible names for the (unaliased) t function
 * @return the resolved t binding name, returning the alias if needed
 */
export function getAliasedTBindingName(
  path: BabelCore.NodePath,
  tFunctionNames: string[],
): string | undefined {
  const properties = path.get("properties");
  const propertiesArray = Array.isArray(properties) ? properties : [properties];

  for (const property of propertiesArray) {
    if (property.isObjectProperty()) {
      const key = property.node.key;
      const value = property.node.value;
      if (
        key.type === "Identifier" &&
        value.type === "Identifier" &&
        tFunctionNames.includes(key.name)
      ) {
        return value.name;
      }
    }
  }

  return tFunctionNames.find((name) => path.scope.bindings[name]);
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
export function findTFunctionCallsFromPropsAssignment(
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
export function findTFunctionCallsInClassComponent(
  path: BabelCore.NodePath<BabelTypes.ClassDeclaration>,
  propertyName: string,
): BabelCore.NodePath<BabelTypes.CallExpression>[] {
  const result = Array<BabelCore.NodePath<BabelTypes.CallExpression>>();

  const thisVisitor: BabelCore.Visitor = {
    ThisExpression(path) {
      if (!path.parentPath.isMemberExpression()) return;

      const propProperty = path.parentPath.get("property");
      if (Array.isArray(propProperty) || !propProperty.isIdentifier()) return;
      if (propProperty.node.name !== propertyName) return;

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
