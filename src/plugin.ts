import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { computeCommentDisableIntervals } from './comments';
import { ExtractionError } from './extractors/commons';
import extractUseTranslationHook from './extractors/useTranslationHook';
import extractTFunction from './extractors/tFunction';
import extractTranslationRenderProp from './extractors/translationRenderProp';
import extractTransComponent from './extractors/transComponent';
import { computeDerivedKeys, ExtractedKey, TranslationKey } from './keys';
import { Config, parseConfig } from './config';
import exportTranslationKeys from './exporter';
import { PLUGIN_NAME } from './constants';

export interface VisitorState {
  // Options inherited from Babel.
  file: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: Partial<Config>;

  // This app state.
  I18NextExtract: I18NextExtractState;
}

interface I18NextExtractState {
  extractedKeys: ExtractedKey[];
  disableExtractionIntervals: [number, number][];
  config: Config;
}

// We have to store which nodes were extracted because the plugin might be called multiple times
// by Babel and the state would be lost across calls.
const extractedNodes = new WeakSet<BabelCore.NodePath>();

/**
 * Handle the extraction.
 *
 * In case of ExtractionError occurring in the callback, a useful error
 * message will display and extraction will continue.
 *
 * @param path Current node path.
 * @param state Current visitor state.
 * @param callback Function to call that may throw ExtractionError.
 */
function handleExtraction<T>(
  path: BabelCore.NodePath,
  state: VisitorState,
  callback: (collect: (keys: ExtractedKey[]) => void) => T,
): T | undefined {
  const filename = (state.file && state.file.opts.filename) || '???';
  const lineNumber = (path.node.loc && path.node.loc.start.line) || '???';

  const collect = (keys: ExtractedKey[]): void => {
    for (const key of keys) {
      if (extractedNodes.has(key.nodePath)) {
        // The node was already extracted. Skip it.
        continue;
      }
      extractedNodes.add(key.nodePath);
      state.I18NextExtract.extractedKeys.push(key);
    }
  };

  try {
    return callback(collect);
  } catch (err) {
    if (err instanceof ExtractionError) {
      // eslint-disable-next-line no-console
      console.warn(
        `${PLUGIN_NAME}: Extraction error in ${filename} at line ` +
          `${lineNumber}. ${err.message}`,
      );
    } else {
      throw err;
    }
  }
}

const Visitor: BabelCore.Visitor<VisitorState> = {
  CallExpression(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        extractUseTranslationHook(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      );
      collect(
        extractTFunction(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      );
    });
  },

  JSXElement(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        extractTranslationRenderProp(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      );
      collect(
        extractTransComponent(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      );
    });
  },
};

export default function(
  api: BabelCore.ConfigAPI,
): BabelCore.PluginObj<VisitorState> {
  api.assertVersion(7);

  return {
    pre() {
      this.I18NextExtract = {
        config: parseConfig(this.opts),
        extractedKeys: [],
        disableExtractionIntervals: [],
      };
    },

    post() {
      const extractState = this.I18NextExtract;

      if (!extractState.extractedKeys) return;

      for (const locale of extractState.config.locales) {
        // eslint-disable-next-line no-console
        console.log(`Exporting locale: ${locale}.`);
        const derivedKeys = this.I18NextExtract.extractedKeys.reduce(
          (accumulator, k) => [
            ...accumulator,
            ...computeDerivedKeys(k, locale, extractState.config),
          ],
          Array<TranslationKey>(),
        );
        exportTranslationKeys(derivedKeys, locale, extractState.config);
      }
    },

    visitor: {
      Program(path, state: VisitorState) {
        // FIXME can't put this in Visitor because `path.traverse()` on a
        // Program node doesn't call the visitor for Program node.
        if (BabelTypes.isFile(path.container)) {
          this.I18NextExtract.disableExtractionIntervals = computeCommentDisableIntervals(
            path.container.comments,
          );
        }

        path.traverse(Visitor, state);
      },
    },
  };
}
