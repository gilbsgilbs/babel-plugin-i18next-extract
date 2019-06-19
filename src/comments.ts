import * as BabelTypes from '@babel/types';
import * as BabelCore from '@babel/core';
import {
  COMMENT_DISABLE_LINE,
  COMMENT_DISABLE_NEXT_LINE,
  COMMENT_DISABLE_SECTION_START,
  COMMENT_DISABLE_SECTION_STOP,
} from './constants';

/**
 * Computes line intervals where i18n extraction should be disabled.
 * @param comments Babel comments
 * @returns sections on which extraction should be disabled
 */
export function computeCommentDisableIntervals(
  comments: BabelTypes.BaseComment[],
): [number, number][] {
  const result = Array<[number, number]>();

  let lastDisableLine: number | null = null;

  for (const { value, loc } of comments) {
    const commentWords = value.split(/\s+/);

    if (commentWords.includes(COMMENT_DISABLE_LINE)) {
      result.push([loc.start.line, loc.start.line]);
    }

    if (commentWords.includes(COMMENT_DISABLE_NEXT_LINE)) {
      result.push([loc.end.line + 1, loc.end.line + 1]);
    }

    if (commentWords.includes(COMMENT_DISABLE_SECTION_START)) {
      lastDisableLine = loc.start.line;
    }

    if (
      commentWords.includes(COMMENT_DISABLE_SECTION_STOP) &&
      lastDisableLine !== null
    ) {
      result.push([lastDisableLine, loc.end.line]);
      lastDisableLine = null;
    }
  }

  if (lastDisableLine !== null) {
    result.push([lastDisableLine, Infinity]);
  }

  return result;
}

/**
 * Check if a given number is within any of the given intervals.
 * @param num number to check
 * @param intervals array of intervals
 * @returns true if num is within any of the intervals.
 */
function numberIsWithinIntervals(
  num: number,
  intervals: [number, number][],
): boolean {
  return intervals.some(([v0, v1]) => v0 <= num && num <= v1);
}

/**
 * Check whether extraction is enables for a given path.
 * @param path: path to check
 * @param disableExtractionIntervals: line intervals where extraction is
 *   disabled.
 * @returns true if the extraction is enabled for the given path.
 */
export function extractionIsEnabledForPath(
  path: BabelCore.NodePath,
  disableExtractionIntervals: [number, number][],
): boolean {
  return !(
    path.node.loc &&
    numberIsWithinIntervals(
      path.node.loc.start.line,
      disableExtractionIntervals,
    )
  );
}
