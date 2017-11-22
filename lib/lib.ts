import {
  aperture,
  applySpec,
  concat,
  converge,
  drop,
  dropWhile,
  either,
  groupWith,
  head,
  isEmpty,
  isNil,
  last,
  map,
  nthArg,
  pipe,
  prop,
  reject,
  sortBy,
  unfold,
} from 'ramda';

import { interval, IntervalFT, IntervalSE } from './data.structures';

const sortByStart = sortBy<IntervalSE>(prop('start'));

const convertFrom = (typeStr: string) => (r: interval): IntervalSE => {
  switch (typeStr) {
    case 'IntervalFT':
      return convertFTtoSE(r as IntervalFT);
    default:
      return r as IntervalSE;
  }
};

const convertFTtoSE = (r: IntervalFT): IntervalSE => ({ start: r.from, end: r.to });
const convertSEtoFT = (r: IntervalSE): IntervalFT => ({ from: r.start, to: r.end });

const getType = (r: interval | interval[]): string => {
  const inter = Array.isArray(r) ? r[0] : r;
  if (inter.hasOwnProperty('start')) {
    return 'IntervalSE';
  }
  if (inter.hasOwnProperty('from')) {
    return 'IntervalFT';
  }
  throw new Error('Unrecognized interval format');
};

const convertTo = <T extends interval>(typeStr: string) => (r: IntervalSE): T => {
  switch (typeStr) {
    case 'IntervalFT':
      return convertSEtoFT(r) as T;
    default:
      return r as T;
  }
};

const prepareInput = (typeStr: string, i: interval | interval[]): IntervalSE[] => {
  if (Array.isArray(i)) {
    return i.map(convertFrom(typeStr));
  }
  return [convertFrom(typeStr)(i)];
};

const complementGen = (boundaries: IntervalSE, intervals: IntervalSE[]): IntervalSE[] => {
  const intervalsS = sortByStart(intervals);
  const prepRanges: IntervalSE[] = [
    { start: -Infinity, end: boundaries.start },
    ...intervalsS,
    { start: boundaries.end, end: Infinity },
  ];
  return reject<IntervalSE | null>(
    isNil,
    aperture(2, prepRanges).map(
      ([r1, r2]) => (r1.end >= r2.start ? null : { start: r1.end, end: r2.start })
    )
  ) as IntervalSE[];
};

/**
 * Complement of `intervals` bounded to `boundaries`. Convert space between two consecutive intervals into interval.
 *
 * input 1 | input 2 | result
 * --- | --- | ---
 * { start: 0, end: 10} | { start: 3, end: 7 } | [{ start: 0, end: 3 }, { start: 7, end: 10 }]
 * { start: 0, end: 10} | [{ start: 2, end: 4 }, { start: 7, end: 8 }] | [{ start: 0, end: 2 }, { start: 4, end: 7 }, { start: 8, end: 10 }]
 */
export function complement<T extends interval>(boundaries: interval, intervals: T | T[]): T[] {
  const typeStr = getType(intervals);
  const intervalSE = prepareInput(typeStr, intervals);
  const boundariesSE = convertFrom(getType(boundaries))(boundaries);
  return complementGen(boundariesSE, intervalSE).map(convertTo<T>(typeStr));
}

const setupForTwoIntervals = <T extends interval>(
  interval1: T | T[],
  interval2: T | T[],
  fn: (i1: IntervalSE[], i2: IntervalSE[]) => IntervalSE[]
): T[] => {
  const typeStr = getType(interval1);
  const r1s = prepareInput(typeStr, interval1);
  const r2s = prepareInput(typeStr, interval2);
  return fn(r1s, r2s).map(convertTo<T>(typeStr));
};

const isOverlappingGen = (a: IntervalSE, b: IntervalSE): boolean => {
  return b.start < a.end && b.end > a.start;
};

const isAdjacentGen = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.end || a.end === b.start;
};

const propFromNthArg = (n: number, propName: string) => pipe(nthArg(n), prop(propName));

const unifyGen = pipe(
  concat as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[],
  sortByStart,
  groupWith(either(isOverlappingGen, isAdjacentGen)),
  map(
    converge(
      applySpec<IntervalSE>({ start: propFromNthArg(0, 'start'), end: propFromNthArg(1, 'end') }),
      [head, last]
    )
  )
) as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[];

export function unify<T extends interval>(interval1: T | T[], interval2: T | T[]): T[] {
  return setupForTwoIntervals<T>(interval1, interval2, unifyGen);
}

const intersectUnfolder = (
  [inters1, inters2]: [IntervalSE[], IntervalSE[]]
): false | [IntervalSE | null, [IntervalSE[], IntervalSE[]]] => {
  if (isEmpty(inters1)) {
    return false;
  }
  const inter1 = inters1[0];
  const newInters2 = dropWhile(i => i.end < inter1.start, inters2);
  if (isEmpty(newInters2)) {
    return false;
  }
  if (newInters2[0].start > inter1.end) {
    return [null, [drop(1, inters1), newInters2]];
  }
  const inter2 = newInters2[0];
  return [
    { end: Math.min(inter1.end, inter2.end), start: Math.max(inter1.start, inter2.start) },
    [drop(1, inters1), newInters2],
  ];
};

const intersectGen = (intervalsA: IntervalSE[], intervalsB: IntervalSE[]): IntervalSE[] => {
  const intervalsAS = sortByStart(intervalsA);
  const intervalsBS = sortByStart(intervalsB);
  return unfold(intersectUnfolder, [intervalsAS, intervalsBS] as [
    IntervalSE[],
    IntervalSE[]
  ]).filter(i => i != null) as IntervalSE[];
};

/**
 * Intersections of `interval1` and `interval2`.
 * @returns An array of intervals or an interval if alone.
 */
export function intersect<T extends interval>(interval1: T, interval2: T): T;
export function intersect<T extends interval>(interval1: T | T[], interval2: T | T[]): T[];
export function intersect<T extends interval>(interval1: T | T[], interval2: T | T[]): any {
  const res = setupForTwoIntervals<T>(interval1, interval2, intersectGen);
  return res.length > 1 ? res : res[0];
}
