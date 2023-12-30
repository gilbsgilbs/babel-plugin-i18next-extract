import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import {
  COMMENT_HINTS_KEYWORDS,
  getCommentHintForPath,
  CommentHint,
} from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import {
  ExtractionError,
  getFirstOrNull,
  findJSXAttributeByName,
  findKeyInObjectExpression,
  evaluateIfConfident,
  iterateObjectExpression,
  referencesImport,
  parseI18NextOptionsFromCommentHints,
  resolveIdentifier,
} from './commons';

/**
 * Check whether a given JSXElement is a Trans component.
 * @param path: node path to check
 * @returns true if the given element is indeed a `Trans` component.
 */
function isTransComponent(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): boolean {
  const openingElement = path.get('openingElement');
  return referencesImport(
    openingElement.get('name'),
    'react-i18next',
    'Trans',
  );
}

/**
 * Given a Trans component, extract its options.
 * @param path The node path of the JSX Element of the trans component
 * @param commentHints Parsed comment hints.
 * @returns The parsed i18next options
 */
function parseTransComponentOptions(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  commentHints: CommentHint[],
): ExtractedKey['parsedOptions'] {
  const res: ExtractedKey['parsedOptions'] = {
    contexts: false,
    hasCount: false,
    keyPrefix: null,
    ns: null,
    defaultValue: null,
  };

  const countAttr = findJSXAttributeByName(path, 'count');
  res.hasCount = countAttr !== null;

  const tOptionsAttr = findJSXAttributeByName(path, 'tOptions');
  if (tOptionsAttr) {
    const value = tOptionsAttr.get('value');
    if (value.isJSXExpressionContainer()) {
      const expression = value.get('expression');
      if (expression.isObjectExpression()) {
        res.contexts =
          findKeyInObjectExpression(expression, 'context') !== null;
      }
    }
  }

  const nsAttr = findJSXAttributeByName(path, 'ns');
  if (nsAttr) {
    let value: BabelCore.NodePath<BabelTypes.Node | null | undefined> =
      nsAttr.get('value');
    if (value.isJSXExpressionContainer()) value = value.get('expression');
    res.ns = getFirstOrNull(evaluateIfConfident(value));
  }

  const defaultsAttr = findJSXAttributeByName(path, 'defaults');
  if (defaultsAttr) {
    let value: BabelCore.NodePath<BabelTypes.Node | null | undefined> =
      defaultsAttr.get('value');
    if (value.isJSXExpressionContainer()) value = value.get('expression');
    res.defaultValue = evaluateIfConfident(value);
  }

  return {
    ...res,
    ...parseI18NextOptionsFromCommentHints(path, commentHints),
  };
}

/**
 * Given the node path of a Trans component, try to extract its key from its
 *   attributes.
 * @param path node path of the Trans component.
 * @returns the component key if it was found.
 * @throws ExtractionError if the i18nKey attribute was present but not
 *   evaluable.
 */
function parseTransComponentKeyFromAttributes(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): string | null {
  const error = new ExtractionError(
    `Couldn't evaluate i18next key in Trans component. You should either ` +
      `make the i18nKey attribute evaluable or skip the line using a skip ` +
      `comment (/* ${COMMENT_HINTS_KEYWORDS.DISABLE.LINE} */ or /* ` +
      `${COMMENT_HINTS_KEYWORDS.DISABLE.NEXT_LINE} */).`,
    path,
  );

  const keyAttribute = findJSXAttributeByName(path, 'i18nKey');
  if (!keyAttribute) return null;

  const keyAttributeValue = keyAttribute.get('value');
  const keyEvaluation = evaluateIfConfident(
    keyAttributeValue.isJSXExpressionContainer()
      ? keyAttributeValue.get('expression')
      : keyAttributeValue,
  );

  if (typeof keyEvaluation !== 'string') {
    throw error;
  }

  return keyEvaluation;
}

/**
 * Check if a JSX element has nested children or if it's a simple text node.
 *
 * Tries to mimic hasChildren function from React i18next:
 * see https://github.com/i18next/react-i18next/blob/8b6caf105/src/Trans.js#L6
 *
 * @param path node path of the JSX element to check
 * @returns whether the node has nested children
 */
function hasChildren(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): boolean {
  const children = path.get('children').filter((path) => {
    // Filter out empty JSX expression containers
    // (they do not count, even if they contain comments)

    if (path.isJSXExpressionContainer()) {
      const expression = path.get('expression');
      return !expression.isJSXEmptyExpression();
    }

    return true;
  });

  if (children.length === 0) return false;
  if (1 < children.length) return true;

  const child = children[0];

  if (child.isJSXExpressionContainer()) {
    let expression = child.get('expression');

    if (expression.isIdentifier()) {
      const resolvedExpression = resolveIdentifier(expression);

      if (resolvedExpression === null) {
        // We weren't able to resolve the identifier. We consider this as
        // an absence of children, but it isn't very relevant anyways
        // because the extraction is very likely to fail later on.
        return false;
      }

      expression = resolvedExpression;
    }

    // If the expression is a string, we have an interpolation like {"foo"}
    // The only other valid interpolation would be {{myVar}} but apparently,
    // it is considered as a nested child.
    return typeof evaluateIfConfident(expression) !== 'string';
  }

  return false;
}

/**
 * Format the key of a JSX element.
 *
 * @param path node path of the JSX element to format.
 * @param index the current index of the node being parsed.
 * @param config plugin configuration.
 * @returns key corresponding to the JSX element.
 */
function formatJSXElementKey(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  index: number,
  config: Config,
): string {
  const openingElement = path.get('openingElement');
  const closingElement = path.get('closingElement');
  let resultTagName = `${index}`; // Tag name we will use in the exported file

  const tagName = openingElement.get('name');
  if (
    openingElement.get('attributes').length === 0 &&
    tagName.isJSXIdentifier() &&
    config.transKeepBasicHtmlNodesFor.includes(tagName.node.name) &&
    !hasChildren(path)
  ) {
    // The tag name should not be transformed to an index
    resultTagName = tagName.node.name;

    if (closingElement.node === null) {
      // opening tag without closing tag (e.g. <br />)
      return `<${resultTagName}/>`;
    }
  }

  // it's nested. let's recurse.
  return `<${resultTagName}>${parseTransComponentKeyFromChildren(
    path,
    config,
  )}</${resultTagName}>`;
}

/**
 * Given the node path of a Trans component, try to extract its key from its
 *   children.
 * @param path node path of the Trans component.
 * @returns the component key if it was found.
 * @throws ExtractionError if the extraction did not succeed.
 */
function parseTransComponentKeyFromChildren(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
): string {
  const transComponentExtractionError = new ExtractionError(
    `Couldn't evaluate i18next key in Trans component. You should either ` +
      `set the i18nKey attribute to an evaluable value, or make the Trans ` +
      `component content evaluable or skip the line using a skip comment ` +
      `(/* ${COMMENT_HINTS_KEYWORDS.DISABLE.LINE} */ or /* ` +
      `${COMMENT_HINTS_KEYWORDS.DISABLE.NEXT_LINE} */).`,
    path,
  );

  let children = path.get('children');
  let result = '';

  // Filter out JSXText nodes that only consist of whitespaces with one or
  // more linefeeds. Such node do not count for the indices.
  children = children.filter((child) => {
    return !(
      child.isJSXText() &&
      child.node.value.trim() === '' &&
      child.node.value.includes('\n')
    );
  });

  // Filter out empty containers. They do not affect indices.
  children = children.filter((p) => {
    if (!p.isJSXExpressionContainer()) return true;
    const expr = p.get('expression');
    return !expr.isJSXEmptyExpression();
  });

  // We can then iterate on the children.
  for (let [i, child] of children.entries()) {
    if (child.isJSXExpressionContainer()) {
      // We have an expression container: {…}
      const expression = child.get('expression');
      const evaluation = evaluateIfConfident(expression);

      if (evaluation !== null && typeof evaluation === 'string') {
        // We have an evaluable JSX expression like {'hello'}
        result += evaluation.toString();
        continue;
      }

      if (expression.isObjectExpression()) {
        // We have an expression like {{name}} or {{name: userName}}
        const it = iterateObjectExpression(expression);
        const key0 = it.next().value;
        if (!key0 || !it.next().done) {
          // Probably got empty object expression like {{}}
          // or {{foo,bar}}
          throw transComponentExtractionError;
        }
        result += `{{${key0[0]}}}`;
        continue;
      }

      if (expression.isIdentifier()) {
        // We have an identifier like {myPartialComponent}
        // We try to find the latest declaration and substitute the identifier.
        const declarationExpression = resolveIdentifier(expression);
        const evaluation = evaluateIfConfident(declarationExpression);
        if (evaluation !== null) {
          // It could be evaluated, it's probably something like 'hello'
          result += evaluation;
          continue;
        } else if (
          declarationExpression !== null &&
          declarationExpression.isJSXElement()
        ) {
          // It's a JSX element. Let's act as if it was inline and move along.
          child = declarationExpression;
        } else {
          throw transComponentExtractionError;
        }
      }
    }

    if (child.isJSXText()) {
      // Simple JSX text.
      result +=
        // Let's sanitize the value a bit.
        child.node.value
          // Strip line returns at start
          .replace(/^\s*(\r?\n)+\s*/gm, '')
          // Strip line returns at end
          .replace(/\s*(\r?\n)+\s*$/gm, '')
          // Replace other line returns with one space
          .replace(/\s*(\r?\n)+\s*/gm, ' ');
      continue;
    }

    if (child.isJSXElement()) {
      // got a JSX element.
      result += formatJSXElementKey(child, i, config);
      continue;
    }
  }

  return result;
}

/**
 * Parse `Trans` component to extract all its translation keys and i18next
 * options.
 *
 * @param path: node path of Trans JSX element.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 * @param skipCheck: set to true if you know that the JSXElement
 *   already is a Trans component.
 */
export default function extractTransComponent(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
  commentHints: CommentHint[] = [],
  skipCheck = false,
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (!skipCheck && !isTransComponent(path)) return [];

  const keyEvaluationFromAttribute =
    parseTransComponentKeyFromAttributes(path);
  const keyEvaluationFromChildren = parseTransComponentKeyFromChildren(
    path,
    config,
  );

  const parsedOptions = parseTransComponentOptions(path, commentHints);
  if (parsedOptions.defaultValue === null) {
    parsedOptions.defaultValue = keyEvaluationFromChildren;
  }

  return [
    {
      key: keyEvaluationFromAttribute || keyEvaluationFromChildren,
      parsedOptions,
      sourceNodes: [path.node],
      extractorName: extractTransComponent.name,
    },
  ];
}
