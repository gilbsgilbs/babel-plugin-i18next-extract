import { dirname, isAbsolute, relative, sep } from 'path';

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { CommentHint, getCommentHintForPath } from '../comments';
import { ExtractedKey } from '../keys';

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
): Partial<ExtractedKey['parsedOptions']> {
  const nsCommentHint = getCommentHintForPath(path, 'NAMESPACE', commentHints);
  const contextCommentHint = getCommentHintForPath(
    path,
    'CONTEXT',
    commentHints,
  );
  const pluralCommentHint = getCommentHintForPath(
    path,
    'PLURAL',
    commentHints,
  );
  const res: Partial<ExtractedKey['parsedOptions']> = {};

  if (nsCommentHint !== null) {
    res.ns = nsCommentHint.value;
  }
  if (contextCommentHint !== null) {
    if (['', 'enable'].includes(contextCommentHint.value)) {
      res.contexts = true;
    } else if (contextCommentHint.value === 'disable') {
      res.contexts = false;
    } else {
      try {
        const val = JSON.parse(contextCommentHint.value);
        if (Array.isArray(val)) res.contexts = val;
        else res.contexts = [contextCommentHint.value];
      } catch (err) {
        res.contexts = [contextCommentHint.value];
      }
    }
  }
  if (pluralCommentHint !== null) {
    if (pluralCommentHint.value === 'disable') {
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
    const obj = nodePath.get('object');
    const prop = nodePath.get('property');
    if (
      Array.isArray(obj) ||
      Array.isArray(prop) ||
      (!prop.isIdentifier() && !prop.isJSXIdentifier())
    )
      return false;
    return (
      obj.referencesImport(moduleSource, '*') && prop.node.name === importName
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

  const obj = nodePath.get('object');
  if (!obj.isIdentifier()) return false;

  const prop = nodePath.get('property');
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
  [string, BabelCore.NodePath<BabelTypes.ObjectExpression['properties'][0]>]
> {
  const properties = path.get('properties');

  for (const prop of properties) {
    const keyPath = prop.get('key');

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
): BabelCore.NodePath<BabelTypes.ObjectExpression['properties'][0]> | null {
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
  const openingElement = path.get('openingElement');
  const attributes = openingElement.get('attributes');

  for (const attribute of attributes) {
    if (!attribute.isJSXAttribute()) continue;

    const attributeName = attribute.get('name');
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
      ? [bindings.path.get('init')]
      : []),
    ...bindings.constantViolations
      .filter((p) => p.isAssignmentExpression())
      .map((p) => p.get('right')),
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
      if (!relativeSourceModulePath.startsWith('.')) {
        relativeSourceModulePath = '.' + sep + relativeSourceModulePath;
      }

      // Absolute path to the source module, let's try a relative path first.
      if (referencesImport(name, relativeSourceModulePath, importName)) {
        return true;
      }
    }
    return referencesImport(name, sourceModule, importName);
  });
}
