import { dirname, isAbsolute, relative, sep } from 'path';
import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import { getCommentHintForPath, CommentHint } from '../comments';
import { referencesImport } from './commons';
import extractUseTranslationHook from './useTranslationHook';
import { ExtractedKey } from '../keys';
import { Config } from '../config';

/**
 * Check whether a given hook is a custom useTranslation hook.
 *
 * @param absoluteCustomUseTranslationHooks: list of possible useTranslation hooks
 *   with their source modules and import names.
 * @param path: node path to check
 * @returns true if the given element is a custom `useTranslation` hook.
 */
function isCustomHook(
  absoluteCustomUseTranslationHooks: Config['cache']['absoluteCustomHooks'],
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
): boolean {
  const callee = path.get('callee');
  return absoluteCustomUseTranslationHooks.some(
    ([sourceModule, importName]): boolean => {
      if (isAbsolute(sourceModule)) {
        let relativeSourceModulePath = relative(
          dirname(path.state.filename),
          sourceModule,
        );
        if (!relativeSourceModulePath.startsWith('.')) {
          relativeSourceModulePath = '.' + sep + relativeSourceModulePath;
        }

        // Absolute path to the source module, let's try a relative path first.
        if (referencesImport(callee, relativeSourceModulePath, importName)) {
          return true;
        }
      }
      return referencesImport(callee, sourceModule, importName);
    },
  );
}

/**
 * Extract custom useTranslation hooks.
 *
 * @param path: node path of potential custom useTranslation hook calls.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractCustomUseTranslationHook(
  path: BabelCore.NodePath<BabelTypes.CallExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (!isCustomHook(config.cache.absoluteCustomHooks, path)) {
    return [];
  }
  return extractUseTranslationHook(path, config, commentHints, true);
}
