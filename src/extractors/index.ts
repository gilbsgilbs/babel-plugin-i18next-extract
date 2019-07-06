import extractTransComponent from './transComponent';
import extractWithTranslationHOC from './withTranslationHOC';
import extractUseTranslationHook from './useTranslationHook';
import extractTranslationRenderProp from './translationRenderProp';
import extractI18nextInstance from './i18nextInstance';
import extractTFunction from './tFunction';
import { ExtractionError } from './commons';

export { ExtractionError };

/**
 * All extractors sorted by priority.
 */
export const EXTRACTORS_PRIORITIES = [
  extractTransComponent.name,
  extractWithTranslationHOC.name,
  extractTranslationRenderProp.name,
  extractUseTranslationHook.name,
  extractI18nextInstance.name,
  extractTFunction.name,
];

export default {
  extractTransComponent,
  extractWithTranslationHOC,
  extractTranslationRenderProp,
  extractUseTranslationHook,
  extractI18nextInstance,
  extractTFunction,
};
