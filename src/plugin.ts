import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';

import { parseCommentHints, CommentHint } from './comments';
import Extractors, {
  EXTRACTORS_PRIORITIES,
  ExtractionError,
} from './extractors';
import { computeDerivedKeys, ExtractedKey, TranslationKey } from './keys';
import { Config, parseConfig } from './config';
import exportTranslationKeys, {
  ExporterCache,
  createExporterCache,
} from './exporters';
import { PLUGIN_NAME } from './constants';
import extractWithTranslationHOC from './extractors/withTranslationHOC';

export interface VisitorState {
  // Options inherited from Babel.
  file: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: Partial<Config>;

  // This app state.
  I18NextExtract: I18NextExtractState;
}

interface I18NextExtractState {
  extractedKeys: ExtractedKey[];
  commentHints: CommentHint[];
  config: Config;
  exporterCache: ExporterCache;
}

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
  const extractState = state.I18NextExtract;

  const collect = (newKeysCandidates: ExtractedKey[]): void => {
    const currentKeys = extractState.extractedKeys;
    const newKeys = Array<ExtractedKey>();

    for (const newKeyCandidate of newKeysCandidates) {
      const conflictingKeyIndex = currentKeys.findIndex(extractedKey =>
        extractedKey.sourceNodes.some(extractedNode =>
          newKeyCandidate.sourceNodes.includes(extractedNode),
        ),
      );

      if (conflictingKeyIndex !== -1) {
        const conflictingKey = currentKeys[conflictingKeyIndex];
        const conflictingKeyPriority = -EXTRACTORS_PRIORITIES.findIndex(
          v => v === conflictingKey.extractorName,
        );
        const newKeyPriority = -EXTRACTORS_PRIORITIES.findIndex(
          v => v === newKeyCandidate.extractorName,
        );

        if (newKeyPriority <= conflictingKeyPriority) {
          // Existing key priority is higher than the extracted key priority.
          // Skip.
          continue;
        }

        // Remove the conflicting key from the extracted keys
        currentKeys.splice(conflictingKeyIndex, 1);
      }

      newKeys.push(newKeyCandidate);
    }

    currentKeys.push(...newKeys);
  };

  try {
    return callback(collect);
  } catch (err) {
    if (!(err instanceof ExtractionError)) {
      throw err;
    }

    // eslint-disable-next-line no-console
    console.warn(
      `${PLUGIN_NAME}: Extraction error in ${filename} at line ` +
        `${lineNumber}. ${err.message}`,
    );
  }
}

const Visitor: BabelCore.Visitor<VisitorState> = {
  CallExpression(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        Extractors.extractUseTranslationHook(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
      collect(
        Extractors.extractI18nextInstance(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
      collect(
        Extractors.extractTFunction(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
    });
  },

  JSXElement(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        Extractors.extractTranslationRenderProp(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
      collect(
        Extractors.extractTransComponent(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
    });
  },

  ClassDeclaration(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        extractWithTranslationHOC(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
    });
  },

  Function(path, state: VisitorState) {
    const extractState = this.I18NextExtract;

    handleExtraction(path, state, collect => {
      collect(
        extractWithTranslationHOC(
          path,
          extractState.config,
          extractState.commentHints,
        ),
      );
    });
  },
};

export default function(
  api: BabelCore.ConfigAPI,
): BabelCore.PluginObj<VisitorState> {
  api.assertVersion(7);

  // This is a cache for the exporter to keep track of the translation files.
  // It must remain global and persist across transpiled files.
  const exporterCache = createExporterCache();

  return {
    pre() {
      this.I18NextExtract = {
        config: parseConfig(this.opts),
        extractedKeys: [],
        commentHints: [],
        exporterCache,
      };
    },

    post() {
      const extractState = this.I18NextExtract;

      if (extractState.extractedKeys.length === 0) return;

      for (const locale of extractState.config.locales) {
        const derivedKeys = extractState.extractedKeys.reduce(
          (accumulator, k) => [
            ...accumulator,
            ...computeDerivedKeys(k, locale, extractState.config),
          ],
          Array<TranslationKey>(),
        );
        exportTranslationKeys(
          derivedKeys,
          locale,
          extractState.config,
          extractState.exporterCache,
        );
      }
    },

    visitor: {
      Program(path, state: VisitorState) {
        // FIXME can't put this in Visitor because `path.traverse()` on a
        // Program node doesn't call the visitor for Program node.
        if (BabelTypes.isFile(path.container)) {
          this.I18NextExtract.commentHints = parseCommentHints(
            path.container.comments,
          );
        }

        path.traverse(Visitor, state);
      },
    },
  };
}
