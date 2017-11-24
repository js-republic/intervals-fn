import {
  any,
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
  unnest,
} from 'ramda';

import { interval, IntervalAR, IntervalFT, IntervalSE } from './data.structures';

const sortByStart = sortBy<IntervalSE>(prop('start'));

const convertFrom = (typeStr: string) => (r: interval): IntervalSE => {
  switch (typeStr) {
    case 'IntervalFT':
      return convertFTtoSE(r as IntervalFT);
    case 'IntervalAR':
      return convertARtoSE(r as IntervalAR);
    default:
      return r as IntervalSE;
  }
};

const convertFTtoSE = (r: IntervalFT): IntervalSE => ({ start: r.from, end: r.to });
const convertARtoSE = ([start, end]: IntervalAR): IntervalSE => ({ start, end });
const convertSEtoFT = (r: IntervalSE): IntervalFT => ({ from: r.start, to: r.end });
const convertSEtoAR = (r: IntervalSE): IntervalAR => [r.start, r.end];

const getType = (r: interval | interval[]): string => {
  const inter = Array.isArray(r) ? r[0] : r;
  if (typeof inter === 'number' || Array.isArray(inter)) {
    return 'IntervalAR';
  }
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
    case 'IntervalAR':
      return convertSEtoAR(r) as T;
    default:
      return r as T;
  }
};

const prepareInput = (typeStr: string, i: interval | interval[]): IntervalSE[] => {
  if (Array.isArray(i) && typeof i[0] !== 'number') {
    return (i as interval[]).map(convertFrom(typeStr));
  }
  return [convertFrom(typeStr)(i as interval)];
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

const complementCurry = <T extends interval>(boundaries: interval, intervals: T | T[]): T[] => {
  if (Array.isArray(intervals) && intervals.length < 1) {
    return [boundaries] as T[];
  }
  const typeStr = getType(intervals);
  const intervalSE = prepareInput(typeStr, intervals);
  const boundariesSE = convertFrom(getType(boundaries))(boundaries);
  return complementGen(boundariesSE, intervalSE).map(convertTo<T>(typeStr));
};

/**
 * Complement of `intervals` bounded to `boundaries`. Convert space between two consecutive intervals into interval.
 *
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 *
 * boundaries | interval(s) | result
 * --- | --- | ---
 * { start: 0, end: 10} | { start: 3, end: 7 } | [{ start: 0, end: 3 }, { start: 7, end: 10 }]
 * { start: 0, end: 10} | [{ start: 2, end: 4 }, { start: 7, end: 8 }] | [{ start: 0, end: 2 }, { start: 4, end: 7 }, { start: 8, end: 10 }]
 *
 * @param boundaries arg1: interval defining boundaries for the complement computation.
 * @param intervals arg2: one interval or array of intervals that complement the result.
 * @returns array of intervals.
 */
export function complement<T extends interval>(boundaries: interval, interv: T | T[]): T[];
export function complement<T extends interval>(boundaries: interval): (interv: T | T[]) => T[];
export function complement<T extends interval>(boundaries: interval, interv?: T | T[]): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return complementCurry<T>(boundaries, tt2);
      };
    case 2:
      return complementCurry<T>(boundaries, interv as T | T[]);
  }
}

const setupForTwoInts = <T extends interval>(
  interval1: T | T[],
  interval2: T | T[]
): [string, IntervalSE[], IntervalSE[]] => {
  const typeStr = getType(interval1);
  return [typeStr, prepareInput(typeStr, interval1), prepareInput(typeStr, interval2)];
};

const setupForTwoIntsToInts = <T extends interval>(
  fn: (i1: IntervalSE[], i2: IntervalSE[]) => IntervalSE[]
) => (interval1: T | T[], interval2: T | T[]): T[] => {
  const [typeStr, arg1, arg2] = setupForTwoInts(interval1, interval2);
  return fn(arg1, arg2).map(convertTo<T>(typeStr));
};

const setupForTwoIntsToBool = <T extends interval>(
  fn: (i1: IntervalSE[], i2: IntervalSE[]) => boolean
) => (interval1: T | T[], interval2: T | T[]): boolean => {
  const [, arg1, arg2] = setupForTwoInts(interval1, interval2);
  return fn(arg1, arg2);
};

const isOverlappingSimple = (a: IntervalSE, b: IntervalSE): boolean => {
  return b.start < a.end && b.end > a.start;
};

const isOverlappingRec = (intervalsA: IntervalSE[], intervalsB: IntervalSE[]): boolean => {
  if (any(isEmpty)([intervalsA, intervalsB])) {
    return false;
  }
  const intsA = intervalsA[0];
  const newInters2 = dropWhile(i => i.end <= intsA.start, intervalsB);
  if (isEmpty(newInters2)) {
    return false;
  }
  const intsB = newInters2[0];
  return isOverlappingSimple(intsA, intsB)
    ? true
    : isOverlappingRec(drop(1, intervalsA), newInters2);
};

const isOverlappingGen = (intervalsA: IntervalSE[], intervalsB: IntervalSE[]): boolean => {
  const intervalsAS = sortByStart(intervalsA);
  const intervalsBS = sortByStart(intervalsB);
  return isOverlappingRec(intervalsAS, intervalsBS);
};

/**
 * Test if two intervals (or array of intervals) overlaps.
 */
export function isOverlapping<T extends interval>(intervalA: T | T[], intervalB: T | T[]): boolean;
export function isOverlapping<T extends interval>(
  intervalA: T | T[]
): (intervalB: T | T[]) => boolean;
export function isOverlapping<T extends interval>(intervalA: T | T[], intervalB?: T | T[]): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): boolean => {
        return setupForTwoIntsToBool<T>(isOverlappingGen)(intervalA, tt2);
      };
    case 2:
      return setupForTwoIntsToBool<T>(isOverlappingGen)(intervalA, intervalB as T | T[]);
  }
}

const isMeetingGen = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.end || a.end === b.start;
};

const propFromNthArg = (n: number, propName: string) => pipe(nthArg(n), prop(propName));

const unifyGen = pipe(
  concat as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[],
  sortByStart,
  groupWith(either(isOverlappingSimple, isMeetingGen)),
  map(
    converge(
      applySpec<IntervalSE>({ start: propFromNthArg(0, 'start'), end: propFromNthArg(1, 'end') }),
      [head, last]
    )
  )
) as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[];

/**
 * Union of `intervals`.
 *
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * { start: 0, end: 4} | { start: 3, end: 7 } | [{ start: 0, end: 7 }]
 * { start: 0, end: 4} | [{ start: 3, end: 7 }, { start: 9, end: 11 }] | [{ start: 0, end: 7 }, { start: 9, end: 11 }]
 *
 * @param intervalA arg1: one interval or array of intervals
 * @param intervalB arg2: one interval or array of intervals
 * @returns union of `arg1` and `arg2`
 */
export function unify<T extends interval>(intervalA: T | T[], intervalB: T | T[]): T[];
export function unify<T extends interval>(intervalA: T | T[]): (intervalB: T | T[]) => T[];
export function unify<T extends interval>(intervalA: T | T[], intervalB?: T | T[]): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return setupForTwoIntsToInts<T>(unifyGen)(intervalA, tt2);
      };
    case 2:
      return setupForTwoIntsToInts<T>(unifyGen)(intervalA, intervalB as T | T[]);
  }
}

const intersectUnfolderSeed = (
  i1: IntervalSE[],
  i2: IntervalSE[]
): [IntervalSE[], IntervalSE[]] => {
  const new1 = i1[0].end > i2[0].end ? i1 : drop(1, i1);
  const new2 = i2[0].end > i1[0].end ? i2 : drop(1, i2);
  return [new1, new2];
};

const intersectUnfolder = (
  [inters1, inters2]: [IntervalSE[], IntervalSE[]]
): false | [IntervalSE | null, [IntervalSE[], IntervalSE[]]] => {
  if (any(isEmpty)([inters1, inters2])) {
    return false;
  }
  const newInters1 = dropWhile(i => i.end <= inters2[0].start, inters1);
  if (isEmpty(newInters1)) {
    return false;
  }
  const inter1 = newInters1[0];
  const newInters2 = dropWhile(i => i.end <= inter1.start, inters2);
  if (isEmpty(newInters2)) {
    return false;
  }
  const inter2 = newInters2[0];
  const minMaxInter = {
    end: Math.min(inter1.end, inter2.end),
    start: Math.max(inter1.start, inter2.start),
  };
  const resultInter = minMaxInter.end <= minMaxInter.start ? null : minMaxInter;
  const seed = intersectUnfolderSeed(newInters1, newInters2);
  return [resultInter, seed];
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
 * Intersection of `intervals`.
 *
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * { start: 0, end: 4 } | { start: 3, end: 7 } | [{ start: 3, end: 4 }]
 * [{ start: 0, end: 4 }, { start: 8, end: 11 }] | [{ start: 2, end: 9 }, { start: 10, end: 13 }] | [{ start: 2, end: 4 }, { start: 8, end: 9 }, { start: 10, end: 11 }]
 *
 * @param intervalA arg1: one interval or array of intervals
 * @param intervalB arg2: one interval or array of intervals
 * @returns intersection of `arg1` and `arg2`
 */
export function intersect<T extends interval>(intervalA: T | T[], intervalB: T | T[]): T[];
export function intersect<T extends interval>(intervalA: T | T[]): (intervalB: T | T[]) => T[];
export function intersect<T extends interval>(intervalA: T | T[], intervalB?: T | T[]): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return setupForTwoIntsToInts<T>(intersectGen)(intervalA, tt2);
      };
    case 2:
      return setupForTwoIntsToInts<T>(intersectGen)(intervalA, intervalB as T | T[]);
  }
}

const subtractInter = (mask: IntervalSE[], base: IntervalSE): IntervalSE[] => {
  return complement(base, mask);
};

const substractGen = (base: IntervalSE[], mask: IntervalSE[]): IntervalSE[] => {
  const intersection = intersectGen(base, mask);
  return unnest(
    base.map(b => subtractInter(intersection.filter(isOverlappingSimple.bind(null, b)), b))
  );
};

/**
 * Subtract `arg1` with `arg2`.
 *
 */
export function substract<T extends interval>(intervalA: T | T[], intervalB: T | T[]): T[];
export function substract<T extends interval>(intervalA: T | T[]): (intervalB: T | T[]) => T[];
export function substract<T extends interval>(intervalA: T | T[], intervalB?: T | T[]): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return setupForTwoIntsToInts<T>(substractGen)(intervalA, tt2);
      };
    case 2:
      return setupForTwoIntsToInts<T>(substractGen)(intervalA, intervalB as T | T[]);
  }
}
