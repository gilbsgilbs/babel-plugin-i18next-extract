/**
 * Extracts translations stored in a JSON object
 * Value of the extracted field is expected to represent arguments of t function
 *
 * Configuration: { }
 *
 * @example
 * const menuItems = [
 *   // Basic use case: the value of i18nToken field is the token
 *   { i18nToken: "home.menu", path:"/" },
 *   { i18nToken: "profile.menu", path: "/profile"}
 *   // TODO: advanced use case, not yet supported
 *   // The array correspond to arguments of the t function: t(...menuItemps[2].i18nToken)
 *   {i18nToken: [["some.date", "another.fallback.key"], { date: "01/01/1970"}}
 * ]
 */

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { getCommentHintForPath, CommentHint } from '../comments';
import { Config } from '../config';
import { ExtractedKey } from '../keys';

/**
 * Parse a call expression (likely a call to a `t` function) to find its
 * translation keys and i18next options.
 *
 * @param path: node path of the t function call.
 * @param config: plugin configuration
 * @param commentHints: parsed comment hints
 */
export default function extractTranslationKey(
  path: BabelCore.NodePath<BabelTypes.ObjectExpression>,
  config: Config,
  commentHints: CommentHint[] = [],
  //skipCheck = false,
): ExtractedKey[] {
  if (getCommentHintForPath(path, 'DISABLE', commentHints)) return [];
  const translationKeysMap = config.cache.translationKeysMap;
  if (!translationKeysMap) return []; // should not happen because we already disable this extractor in the plugin when there are no keys
  const extractedKeys: ExtractedKey[] = [];
  //if (!skipCheck && !isSimpleTCall(path, config)) return [];
  const properties = path.get('properties');
  properties.forEach((propertyPath) => {
    if (propertyPath.isObjectProperty()) {
      const keyPath = propertyPath.get('key');
      if (Array.isArray(keyPath)) {
        return;
      }
      const valuePath = propertyPath.get('value');
      if (valuePath.isStringLiteral()) {
        if (keyPath.isIdentifier()) {
          const keyName = keyPath.node.name;
          if (!translationKeysMap[keyName]) {
            return;
          }
          // TODO: we can only handle basic string tokens currently, like: i18nToken: "foo.bar"
          const stringKey = valuePath.node.value;
          extractedKeys.push({
            key: stringKey,
            parsedOptions: {
              contexts: false,
              defaultValue: null,
              hasCount: false,
              ns: null,
            },
            sourceNodes: [path.node],
            extractorName: extractTranslationKey.name,
          });
        }
      }
    }
  });
  return extractedKeys;
}
