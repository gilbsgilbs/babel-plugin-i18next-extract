import { dirname, isAbsolute, relative, sep } from 'path';

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { getCommentHintForPath, CommentHint } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import { referencesImport } from './commons';
import extractTransComponent from './transComponent';

/**
 * Check whether a given JSXElement is a custom Trans component.
 *
 * @param absoluteCustomTransComponents: list of possible Trans components
 *   with their source modules and import names.
 * @param path: node path to check
 * @returns true if the given element is a custom `Trans` component.
 */
function isCustomTransComponent(
  absoluteCustomTransComponents: Config['cache']['absoluteCustomTransComponents'],
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
): boolean {
  const openingElementName = path.get('openingElement').get('name');
  return absoluteCustomTransComponents.some(
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
        if (
          referencesImport(
            openingElementName,
            relativeSourceModulePath,
            importName,
          )
        ) {
          return true;
        }
      }
      return referencesImport(openingElementName, sourceModule, importName);
    },
  );
}

/**
 * Extract custom Trans components.
 *
 * @param path: node path of potential custom Trans JSX element.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractCustomTransComponent(
  path: BabelCore.NodePath<BabelTypes.JSXElement>,
  config: Config,
  commentHints: CommentHint[] = [],
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  if (
    !isCustomTransComponent(config.cache.absoluteCustomTransComponents, path)
  )
    return [];
  return extractTransComponent(path, config, commentHints, true);
}
