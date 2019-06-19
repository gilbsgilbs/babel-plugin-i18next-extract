import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import extractTFunction from './tFunction';
import { ExtractedKey } from '../keys';
import { Config } from '../config';
import { findJSXAttributeByName, evaluateIfConfident } from '../utils';
import { getFirstOrNull } from './commons';

/**
 * Check whether a given JSXElement is a Translation render prop.
 * @param path: node path to check
 * @returns true if the given element is indeed a `Translation` render prop.
 */
function isTranslationRenderProp(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): boolean {
  const openingElement = path.get('openingElement');
  return openingElement
    .get('name')
    .referencesImport('react-i18next', 'Translation');
}

/**
 * Parse `Translation` render prop to extract all its translation keys and
 * options.
 *
 * @param path: node path of Translation JSX element.
 * @param config: plugin configuration
 * @param disableExtractionIntervals: interval of lines where extraction is
 *   disabled
 */
export default function extractTranslationRenderProp(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
  disableExtractionIntervals: [number, number][] = [],
): ExtractedKey[] {
  if (!isTranslationRenderProp(path)) return [];

  // Try to parse ns property
  let ns: string | null = null;
  const nsAttr = findJSXAttributeByName(path, 'ns');
  if (nsAttr) {
    let value: BabelCore.NodePath<BabelTypes.Node | null> = nsAttr.get(
      'value',
    );
    if (value.isJSXExpressionContainer()) value = value.get('expression');
    ns = getFirstOrNull(evaluateIfConfident(value));
  }

  // We expect at least "<Translation>{(t) => …}</Translation>
  const expressionContainer = path
    .get('children')
    .filter(p => p.isJSXExpressionContainer())[0];
  if (!expressionContainer || !expressionContainer.isJSXExpressionContainer())
    return [];
  const expression = expressionContainer.get('expression');
  if (!expression.isArrowFunctionExpression()) return [];

  const tParam = expression.get('params')[0];
  if (!tParam) return [];

  const tBinding = tParam.scope.bindings['t'];
  if (!tBinding) return [];

  let keys = Array<ExtractedKey>();
  for (const reference of tBinding.referencePaths) {
    if (reference.parentPath.isCallExpression()) {
      keys = [
        ...keys,
        ...extractTFunction(
          reference.parentPath,
          config,
          disableExtractionIntervals,
          true,
        ).map(k => ({
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

  return keys;
}
