import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import {
  COMMENT_HINTS_KEYWORDS,
  getCommentHintForPath,
  CommentHint,
} from '../comments';
import {
  ExtractionError,
  getFirstOrNull,
  findJSXAttributeByName,
  findKeyInObjectExpression,
  evaluateIfConfident,
  iterateObjectExpression,
  referencesImport,
  parseI18NextOptionsFromCommentHints,
} from './commons';
import { ExtractedKey } from '../keys';
import { Config } from '../config';

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
    let value: BabelCore.NodePath<BabelTypes.Node | null> = nsAttr.get(
      'value',
    );
    if (value.isJSXExpressionContainer()) value = value.get('expression');
    res.ns = getFirstOrNull(evaluateIfConfident(value));
  }

  const defaultsAttr = findJSXAttributeByName(path, 'defaults');
  if (defaultsAttr) {
    let value: BabelCore.NodePath<BabelTypes.Node | null> = defaultsAttr.get(
      'value',
    );
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
 * Given the node path of a Trans component, try to extract its key from its
 *   children.
 * @param path node path of the Trans component.
 * @returns the component key if it was found.
 * @throws ExtractionError if the extraction did not succeed.
 */
function parseTransComponentKeyFromChildren(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): string {
  const error = new ExtractionError(
    `Couldn't evaluate i18next key in Trans component. You should either ` +
      `set the i18nKey attribute to an evaluable value, or make the Trans ` +
      `component content evaluable or skip the line using a skip comment ` +
      `(/* ${COMMENT_HINTS_KEYWORDS.DISABLE.LINE} */ or /* ` +
      `${COMMENT_HINTS_KEYWORDS.DISABLE.NEXT_LINE} */).`,
  );

  let children = path.get('children');
  let result = '';

  // Remove trailing empty JSXText nodes. They should not be taken into
  // account for the indices.
  const firstChild = children[0];
  if (
    firstChild &&
    firstChild.isJSXText() &&
    firstChild.node.value.trim() === ''
  ) {
    children = children.slice(1);
  }
  const lastChild = children[children.length - 1];
  if (
    lastChild &&
    lastChild.isJSXText() &&
    lastChild.node.value.trim() === ''
  ) {
    children = children.slice(0, children.length - 1);
  }

  // Filter out empty containers. They do not affect indices.
  children = children.filter(p => {
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
          throw error;
        }
        result += `{{${key0[0]}}}`;
        continue;
      }

      if (expression.isIdentifier()) {
        // We have an identifier like {myPartialComponent}
        // We try to find the latest declaration and substitute the identifier.
        const bindings = expression.scope.bindings[expression.node.name];
        if (!bindings) throw error;

        const declarationExpressions = [
          ...(bindings.path.isVariableDeclarator()
            ? [bindings.path.get('init')]
            : []),
          ...bindings.constantViolations
            .filter(p => p.isAssignmentExpression())
            .map(p => p.get('right')),
        ];
        if (declarationExpressions.length === 0) throw error;
        const latestDeclarator =
          declarationExpressions[declarationExpressions.length - 1];
        if (Array.isArray(latestDeclarator)) throw error;
        const evaluation = evaluateIfConfident(latestDeclarator);
        if (evaluation !== null) {
          // It could be evaluated, it's probably something like 'hello'
          result += evaluation;
          continue;
        } else if (latestDeclarator.isJSXElement()) {
          // It's a JSX element. Let's act as if it was inline and move along.
          child = latestDeclarator;
        } else {
          throw error;
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
      if (child.get('closingElement').node === null) {
        // opening tag without closing tag (e.g. <br />)
        result += `<${i}>`;
        continue;
      }

      // it's nested. let's recurse.
      result += `<${i}>${parseTransComponentKeyFromChildren(child)}</${i}>`;
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
 */
export default function extractTransComponent(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (!isTransComponent(path)) return [];

  const keyEvaluationFromAttribute = parseTransComponentKeyFromAttributes(
    path,
  );
  const keyEvaluationFromChildren = parseTransComponentKeyFromChildren(path);

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
