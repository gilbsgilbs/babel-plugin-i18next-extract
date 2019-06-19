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

interface I18NextExtractState {
  extractedKeys: ExtractedKey[];
  extractedNodes: Set<BabelCore.Node>;
  disableExtractionIntervals: [number, number][];
  config: Config;
}

export interface VisitorState {
  // Options inherited from Babel.
  file: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: Partial<Config>;

  // This app state.
  I18NextExtract: I18NextExtractState;
}

/**
 * Display useful information in case of ExtractionError
 * @param path Current node path.
 * @param state Current visitor state.
 * @param callback Function to call that may throw ExtractionError
 */
function handleExtractionError<T>(
  path: BabelCore.NodePath,
  state: VisitorState,
  callback: () => T,
): T | undefined {
  const filename = (state.file && state.file.opts.filename) || '???';
  const lineNumber = (path.node.loc && path.node.loc.start.line) || '???';

  try {
    return callback();
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

    if (extractState.extractedNodes.has(path.node)) return;
    extractState.extractedNodes.add(path.node);

    handleExtractionError(path, state, () => {
      extractState.extractedKeys = [
        ...extractState.extractedKeys,
        ...extractUseTranslationHook(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
        ...extractTFunction(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      ];
    });
  },

  JSXElement(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    if (extractState.extractedNodes.has(path.node)) return;
    extractState.extractedNodes.add(path.node);

    handleExtractionError(path, state, () => {
      extractState.extractedKeys = [
        ...extractState.extractedKeys,
        ...extractTranslationRenderProp(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
        ...extractTransComponent(
          path,
          extractState.config,
          extractState.disableExtractionIntervals,
        ),
      ];
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
        extractedNodes: new Set(),
        disableExtractionIntervals: [],
      };
    },

    post() {
      const extractState = this.I18NextExtract;

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
