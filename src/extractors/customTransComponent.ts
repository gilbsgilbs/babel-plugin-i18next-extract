import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { getCommentHintForPath, CommentHint } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

import { isCustomImportedNode } from './commons';
import extractTransComponent from './transComponent';

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
    !isCustomImportedNode(
      config.cache.absoluteCustomTransComponents,
      path,
      path.get('openingElement').get('name'),
    )
  )
    return [];
  return extractTransComponent(path, config, commentHints, true);
}
