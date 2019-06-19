import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import extractTFunction from './tFunction';
import { ExtractedKey } from '../keys';
import { Config } from '../config';
import { getFirstOrNull } from './commons';
import { evaluateIfConfident } from '../utils';

/**
 * Check whether a given CallExpression path is a call to `useTranslation` hook.
 * @param path: node path to check
 * @returns true if the given call expression is indeed a call to
 *   `useTranslation`
 */
function isUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
): boolean {
  const callee = path.get('callee');
  return callee.referencesImport('react-i18next', 'useTranslation');
}

/**
 * Parse `useTranslation()` hook to extract all its translation keys and
 * options.
 * @param path: useTranslation call node path.
 * @param config: plugin configuration
 * @param disableExtractionIntervals: interval of lines where extraction is
 *   disabled
 */
export default function extractUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  disableExtractionIntervals: [number, number][] = [],
): ExtractedKey[] {
  if (!isUseTranslationHook(path)) return [];

  const namespaceArgument = path.get('arguments')[0];
  const ns = getFirstOrNull(evaluateIfConfident(namespaceArgument));

  const parentPath = path.parentPath;
  if (!parentPath.isVariableDeclarator()) return [];

  const id = parentPath.get('id');

  const tBinding = id.scope.bindings['t'];
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
