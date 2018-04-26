import {
  any,
  aperture,
  applySpec,
  chain,
  concat,
  converge,
  dissoc,
  drop,
  dropWhile,
  either,
  groupWith,
  head,
  identity,
  isEmpty,
  isNil,
  map,
  nthArg,
  pipe,
  prop,
  reject,
  sortBy,
  unfold,
  unnest,
} from 'ramda';

import { interval, IntervalAR, IntervalFT, IntervalSE, roai, roat } from './data.structures';

type twoIntsToBoolFn = (i1: IntervalSE[], i2: IntervalSE[]) => boolean;

const sortByStart = sortBy<IntervalSE>(prop('start'));

const dissocMany = (...props: string[]) => {
  return pipe.apply(null, props.map(p => dissoc(p))); // Workaround for TS issue #4130
};

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

const convertFTtoSE = (r: IntervalFT): IntervalSE =>
  dissocMany('from', 'to')({ ...r, start: r.from, end: r.to });
const convertARtoSE = ([start, end]: IntervalAR): IntervalSE => ({ start, end });
const convertSEtoFT = (r: IntervalSE): IntervalFT =>
  dissocMany('start', 'end')({ ...r, from: r.start, to: r.end });
const convertSEtoAR = (r: IntervalSE): IntervalAR => [r.start, r.end];

const getType = (r: interval | ReadonlyArray<interval>): string => {
  const inter = Array.isArray(r) ? r[0] : r;
  if (typeof inter === 'number' || Array.isArray(inter)) {
    return 'IntervalAR';
  }
  if (inter == null || inter.hasOwnProperty('start')) {
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

const prepareInput = (typeStr: string, i: interval | roai): IntervalSE[] => {
  if (Array.isArray(i) && typeof i[0] !== 'number') {
    return (i as any[]).map(convertFrom(typeStr)); // See TS issue: #17002 & #19892
  }
  return [convertFrom(typeStr)(i as interval)];
};

const complementGen = (boundaries: IntervalSE, intervals: IntervalSE[]): IntervalSE[] => {
  const intervalsS = sortByStart(intervals);
  const { start, end, ...rest } = boundaries;
  const prepRanges: IntervalSE[] = [
    { start: -Infinity, end: start },
    ...intervalsS,
    { start: end, end: Infinity },
  ];
  return reject<IntervalSE | null>(
    isNil,
    aperture(2, prepRanges).map(
      ([r1, r2]) => (r1.end >= r2.start ? null : { start: r1.end, end: r2.start, ...rest })
    )
  ) as IntervalSE[];
};

const complementCurry = <D extends interval, T extends interval>(
  boundaries: D,
  intervals: T | T[]
): D[] => {
  if (Array.isArray(intervals) && intervals.length < 1) {
    return [boundaries] as D[];
  }
  const typeStr = getType(boundaries);
  const intervalSE = prepareInput(typeStr, intervals);
  const boundariesSE = convertFrom(getType(boundaries))(boundaries);
  return complementGen(boundariesSE, intervalSE).map(convertTo<D>(typeStr));
};

/**
 * Complement of `intervals` bounded to `boundaries`. Convert space between two consecutive intervals into interval.
 * Keeps extra object properties on `boundaries`.
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
export function complement<D extends interval, T extends interval>(
  boundaries: D,
  interv: T | roat<T>
): D[];
export function complement<D extends interval, T extends interval>(
  boundaries: D
): (interv: T | roat<T>) => D[];
export function complement<D extends interval, T extends interval>(
  boundaries: D,
  interv?: T | roat<T>
): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): D[] => {
        return complementCurry<D, T>(boundaries, tt2);
      };
    case 2:
      return complementCurry<D, T>(boundaries, interv as T | T[]);
  }
}

const setupForTwoIntsOneType = <T extends interval>(
  interval1: T | roat<T>,
  interval2: T | roat<T>
): [string, IntervalSE[], IntervalSE[]] => {
  const typeStr = getType(interval1);
  return [typeStr, prepareInput(typeStr, interval1), prepareInput(typeStr, interval2)];
};

const setupOneType = converge(prepareInput, [getType, identity]);

const setupForOneIntsToInts = <T extends interval>(fn: (i1: IntervalSE[]) => IntervalSE[]) => (
  interval1: roat<T>
): T[] => {
  const typeStr = getType(interval1);
  const arg1 = prepareInput(typeStr, interval1);
  return fn(arg1).map(convertTo<T>(typeStr));
};

const setupForOneIntsWithConvertToInts = <T extends interval>(
  fn: (convert: (i: IntervalSE) => T, i1: IntervalSE[]) => IntervalSE[]
) => (interval1: roat<T>): T[] => {
  const typeStr = getType(interval1);
  const arg1 = prepareInput(typeStr, interval1);
  const converter = convertTo<T>(typeStr);
  return fn(converter, arg1).map(converter);
};

const setupForTwoIntsToInts = <T extends interval>(
  fn: (i1: IntervalSE[], i2: IntervalSE[]) => IntervalSE[]
) => (interval1: T | roat<T>, interval2: T | roat<T>): T[] => {
  const [typeStr, arg1, arg2] = setupForTwoIntsOneType(interval1, interval2);
  return fn(arg1, arg2).map(convertTo<T>(typeStr));
};

const setupForOneIOneTToInts = <T extends interval>(
  fn: (i1: IntervalSE[], i2: IntervalSE[]) => IntervalSE[]
) => (interval1: interval | roat<interval>, interval2: T | roat<T>): T[] => {
  const typeStr1 = getType(interval1);
  const typeStr2 = getType(interval2);
  return fn(prepareInput(typeStr1, interval1), prepareInput(typeStr2, interval2)).map(
    convertTo<T>(typeStr2)
  );
};

const setupForTwoIntsToBool = (fn: twoIntsToBoolFn) => (
  interval1: interval | roat<interval>,
  interval2: interval | roat<interval>
): boolean => {
  return fn.apply(null, [interval1, interval2].map(setupOneType));
};

const isOverlappingSimple = (a: IntervalSE, b: IntervalSE): boolean => {
  return b.start < a.end && b.end > a.start;
};

const beforeOrAdjTo = (afterInt: IntervalSE) => (beforeInt: IntervalSE) =>
  beforeInt.end <= afterInt.start;

const isOverlappingRec = (intervalsA: IntervalSE[], intervalsB: IntervalSE[]): boolean => {
  if (any(isEmpty)([intervalsA, intervalsB])) {
    return false;
  }
  const intsA = intervalsA[0];
  const newInters2 = dropWhile(beforeOrAdjTo(intsA), intervalsB);
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

const curryBool = (
  argLength: number,
  arg1: interval | roat<interval>,
  arg2: interval | roat<interval> | undefined,
  fn: twoIntsToBoolFn
): any => {
  switch (argLength) {
    case 1:
      return (tt2: interval | interval[]): boolean => {
        return setupForTwoIntsToBool(fn)(arg1, tt2);
      };
    case 2:
      return setupForTwoIntsToBool(fn)(arg1, arg2 as interval | interval[]);
  }
};

/**
 * Test if `intervalA` overlaps with `intervalB`.
 *
 * Curried function. Accept array of intervals.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 0, end: 10} | { start: 3, end: 7 } | true
 * { start: 0, end: 5} | { start: 5, end: 7 } | false
 * { start: 5, end: 10} | [{ start: 0, end: 4 }, { start: 7, end: 8 }] | true
 *
 * @param intervalA arg1: interval or array of intervals
 * @param intervalB arg2: interval or array of intervals
 * @returns true if overlaps
 */
export function isOverlapping(
  intervalA: interval | roat<interval>,
  intervalB: interval | roat<interval>
): boolean;
export function isOverlapping(
  intervalA: interval | roat<interval>
): (intervalB: interval | roat<interval>) => boolean;
export function isOverlapping(
  intervalA: interval | roat<interval>,
  intervalB?: interval | roat<interval>
): any {
  return curryBool(arguments.length, intervalA, intervalB, isOverlappingGen);
}

const isMeetingSimple = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.end || a.end === b.start;
};
const isMeetingGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return isMeetingSimple(a, b);
};

/**
 * Test if `intervalA` is adjacent to (meets) `intervalB`.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 0, end: 10} | { start: 3, end: 7 } | false
 * { start: 0, end: 5} | { start: 5, end: 7 } | true
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if adjacent
 */
export function isMeeting(intervalA: interval, intervalB: interval): boolean;
export function isMeeting(intervalA: interval): (intervalB: interval) => boolean;
export function isMeeting(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isMeetingGen);
}

const isBeforeGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.end <= b.start;
};

/**
 * Test if `intervalA` is before or adjacent `intervalB`.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 0, end: 2} | { start: 3, end: 7 } | true
 * { start: 0, end: 5} | { start: 3, end: 7 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if before
 */
export function isBefore(intervalA: interval, intervalB: interval): boolean;
export function isBefore(intervalA: interval): (intervalB: interval) => boolean;
export function isBefore(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isBeforeGen);
}

const isAfterGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.start >= b.end;
};

/**
 * Test if `intervalA` is after or adjacent `intervalB`.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 5, end: 10} | { start: 3, end: 4 } | true
 * { start: 5, end: 10} | { start: 3, end: 6 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if after
 */
export function isAfter(intervalA: interval, intervalB: interval): boolean;
export function isAfter(intervalA: interval): (intervalB: interval) => boolean;
export function isAfter(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isAfterGen);
}

const isStartingGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.start === b.start;
};

/**
 * Test if `intervalA` and `intervalB` share the same starting point.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 5, end: 10} | { start: 5, end: 4 } | true
 * { start: 5, end: 10} | { start: 0, end: 10 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if same starting point
 */
export function isStarting(intervalA: interval, intervalB: interval): boolean;
export function isStarting(intervalA: interval): (intervalB: interval) => boolean;
export function isStarting(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isStartingGen);
}

const isEndingGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.end === b.end;
};

/**
 * Test if `intervalA` and `intervalB` share the same ending point.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 5, end: 10} | { start: 0, end: 10 } | true
 * { start: 5, end: 10} | { start: 5, end: 7 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if same ending point
 */
export function isEnding(intervalA: interval, intervalB: interval): boolean;
export function isEnding(intervalA: interval): (intervalB: interval) => boolean;
export function isEnding(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isEndingGen);
}

const isDuringGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.start >= b.start && a.end <= b.end;
};

/**
 * Test if `intervalA` occurs in `intervalB`. `intervalsB` act as boundaries. Can share starting and/or ending point.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 2, end: 6} | { start: 0, end: 10 } | true
 * { start: 5, end: 10} | { start: 0, end: 10 } | true
 * { start: 5, end: 10} | { start: 0, end: 9 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if `intervalA` occurs in `intervalB`
 */
export function isDuring(intervalA: interval, intervalB: interval): boolean;
export function isDuring(intervalA: interval): (intervalB: interval) => boolean;
export function isDuring(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isDuringGen);
}

const isEqualGen = ([a]: IntervalSE[], [b]: IntervalSE[]): boolean => {
  return a.start === b.start && a.end === b.end;
};

/**
 * Test if `intervalA` is equivalent to `intervalB`.
 *
 * Curried function.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 5, end: 10} | { start: 5, end: 10 } | true
 * { start: 5, end: 10} | { start: 0, end: 10 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if equivalent
 */
export function isEqual(intervalA: interval, intervalB: interval): boolean;
export function isEqual(intervalA: interval): (intervalB: interval) => boolean;
export function isEqual(intervalA: interval, intervalB?: interval): any {
  return curryBool(arguments.length, intervalA, intervalB, isEqualGen);
}

const propFromNthArg = (n: number, propName: string) => pipe(nthArg(n), prop(propName));
const maxEnd = (ranges: IntervalSE[]) => ranges.reduce((a, b) => (a.end > b.end ? a : b));

const simplifyGen = pipe(
  sortByStart,
  groupWith(either(isOverlappingSimple, isMeetingSimple)),
  map(
    converge(
      applySpec<IntervalSE>({ start: propFromNthArg(0, 'start'), end: propFromNthArg(1, 'end') }),
      [head, maxEnd]
    )
  )
) as (a: IntervalSE[]) => IntervalSE[];

/**
 * Simplification of `intervals`. Unify touching or overlapping intervals.
 *
 * Doesn't mutate input. Output keeps input's structure.
 *
 * | intervals A | result |
 * | ----------- | ------ |
 * | [{ start: 3, end: 9 }, { start: 9, end: 13 }, { start: 11, end: 14 }] | [{ start: 3, end: 14 }] |
 *
 * @param intervalA
 */
export function simplify<T extends interval>(intervalA: roat<T>): T[] {
  return setupForOneIntsToInts<T>(simplifyGen)(intervalA);
}

const unifyGen = pipe(
  concat as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[],
  simplifyGen
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
export function unify<T extends interval>(intervalA: T | roat<T>, intervalB: T | roat<T>): T[];
export function unify<T extends interval>(intervalA: T | roat<T>): (intervalB: T | roat<T>) => T[];
export function unify<T extends interval>(intervalA: T | roat<T>, intervalB?: T | roat<T>): any {
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

const intersectUnfolder = ([inters1, inters2]: [IntervalSE[], IntervalSE[]]):
  | false
  | [IntervalSE | null, [IntervalSE[], IntervalSE[]]] => {
  if (any(isEmpty)([inters1, inters2])) {
    return false;
  }
  const newInters1 = dropWhile(beforeOrAdjTo(inters2[0]), inters1);
  if (isEmpty(newInters1)) {
    return false;
  }
  const inter1 = newInters1[0];
  const newInters2 = dropWhile(beforeOrAdjTo(inter1), inters2);
  if (isEmpty(newInters2)) {
    return false;
  }
  const inter2 = newInters2[0];
  const minMaxInter = {
    ...inter2,
    end: Math.min(inter1.end, inter2.end),
    start: Math.max(inter1.start, inter2.start),
  };
  const resultInter = beforeOrAdjTo(minMaxInter)(minMaxInter) ? null : minMaxInter;
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
 * Intersection of `intervals`. Does not simplify result. Keeps extra object properties on `intervalB`.
 *
 * `interalA` and `interalB` can have different structure.
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps `intervalB` structure.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * { from: 0, to: 4 } | { start: 3, end: 7, foo: 'bar' } | [{ start: 3, end: 4, foo: 'bar' }]
 * { start: 0, end: 10 } | [{ start: 2, end: 5}, { start: 5, end: 8}] | [{ start: 2, end: 5 }, { start: 5, end: 8 }]
 * [{ start: 0, end: 4 }, { start: 8, end: 11 }] | [{ start: 2, end: 9 }, { start: 10, end: 13 }] | [{ start: 2, end: 4 }, { start: 8, end: 9 }, { start: 10, end: 11 }]
 *
 * @param intervalA arg1: one interval or array of intervals
 * @param intervalB arg2: one interval or array of intervals
 * @returns intersection of `arg1` and `arg2`
 */
export function intersect<T extends interval>(
  intervalA: interval | roat<interval>,
  intervalB: T | roat<T>
): T[];
export function intersect<T extends interval>(
  intervalA: interval | roat<interval>
): (intervalB: T | roat<T>) => T[];
export function intersect<T extends interval>(
  intervalA: interval | roat<interval>,
  intervalB?: T | roat<T>
): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return setupForOneIOneTToInts<T>(intersectGen)(intervalA, tt2);
      };
    case 2:
      return setupForOneIOneTToInts<T>(intersectGen)(intervalA, intervalB as T | T[]);
  }
}

const minStart = (ranges: IntervalSE[]) => ranges.reduce((a, b) => (a.start < b.start ? a : b));

const mergeUnfolder = (mergeFn: (ints: any[]) => any, convert: (int: IntervalSE) => any) => (
  ints: IntervalSE[]
): false | [any, IntervalSE[]] => {
  if (!ints.length) {
    return false;
  }
  const start = minStart(ints).start;
  const withoutStart = ints
    .filter(a => a.end > start)
    .map(a => (a.start === start ? { ...a, start: a.end } : a));
  const end = minStart(withoutStart).start;
  const toMerge = ints.filter(a => isDuringGen([{ start, end }], [a])).map(convert);
  const next = { ...mergeFn(toMerge), start, end };
  return [
    next,
    ints.filter(a => a.end > end).map(a => (a.start <= end ? { ...a, start: end } : a)),
  ];
};

const mergeGen = (mergeFn: (ints: any[]) => any) => (
  convert: (int: IntervalSE) => any,
  intervals: IntervalSE[]
): IntervalSE[] => {
  const sorted = sortByStart(intervals);
  return unfold(mergeUnfolder(mergeFn, convert), sorted) as IntervalSE[];
};

/**
 * Merge extra properties of all intervals inside `intervals`, when overlapping, with provided function `mergeFn`.
 * Can also be used to generate an array of intervals without overlaps
 *
 * Curried function. Doesn't mutate input. Output keeps input's structure.
 *
 * parameter | value
 * --- | ---
 * mergeFn | `(a, b) => {...a, data: a.data + b.data }`
 * intervals | `[{ start: 0, end: 10, data: 5 }, { start: 4, end: 7, data: 100 }]`
 * result | `[{ start: 0, end: 4, data: 5 }, { start: 4, end: 7, data: 105 }, { start: 7, end: 10, data: 5 }]`
 * @param mergeFn arg1: function to merge extra properties of overlapping intervals
 * @param intervals arg2: intervals with extra properties.
 */
export function merge<T extends interval>(mergeFn: (ints: T[]) => T, intervals: roat<T>): T[];
export function merge<T extends interval>(mergeFn: (ints: T[]) => T): (intervals: roat<T>) => T[];
export function merge<T extends interval>(mergeFn: (ints: T[]) => T, intervals?: roat<T>): any {
  switch (arguments.length) {
    case 1:
      return (ints: roat<T>): T[] => {
        return setupForOneIntsWithConvertToInts<T>(mergeGen(mergeFn))(ints);
      };
    case 2:
      return setupForOneIntsWithConvertToInts<T>(mergeGen(mergeFn))(intervals as T[]);
  }
}

const subtractInter = (mask: IntervalSE[], base: IntervalSE): IntervalSE[] => {
  return complement(base, mask);
};

const substractGen = (base: IntervalSE[], mask: IntervalSE[]): IntervalSE[] => {
  const intersection = intersectGen(mask, base);
  return unnest(
    base.map(b => subtractInter(intersection.filter(isOverlappingSimple.bind(null, b)), b))
  );
};

/**
 * Subtact `intervalA` with `intervalB`. `intervalB` act as a mask.
 * Keeps extra object properties on `intervalA`.
 *
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * { start: 0, end: 4 } | { start: 3, end: 7 } | [{ start: 0, end: 3 }]
 * [{ start: 0, end: 4 }, { start: 8, end: 11 }] | [{ start: 2, end: 9 }, { start: 10, end: 13 }] | [{ start: 0, end: 2 }, { start: 9, end: 10 }]
 *
 * @param intervalA arg1: one interval or array of intervals
 * @param intervalB arg2: one interval or array of intervals
 * @returns intersection of `arg1` and `arg2`
 */
export function substract<D extends interval, T extends interval>(
  intervalA: D | roat<D>,
  intervalB: T | roat<T>
): D[];
export function substract<D extends interval, T extends interval>(
  intervalA: D | roat<D>
): (intervalB: T | roat<T>) => D[];
export function substract<D extends interval, T extends interval>(
  intervalA: D | roat<D>,
  intervalB?: T | roat<T>
): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): D[] => {
        return setupForTwoIntsToInts<D>(substractGen)(intervalA, tt2 as any);
      };
    case 2:
      return setupForTwoIntsToInts<D>(substractGen)(intervalA, intervalB as any);
  }
}

const numberToRange = (n: number): IntervalSE => ({ start: n, end: n });

const splitGen = (splits: roat<number>, intervals: IntervalSE[]): IntervalSE[] => {
  return chain((i => {
    return chain((int => [
      { ...int, start: int.start, end: i },
      { ...int, start: i, end: int.end },
    ]), intervals.filter(int => isOverlappingSimple(int, numberToRange(i))));
  }), splits);
};

const splitCurry = <T extends interval>(splitIndexes: roat<number>, intervals: T | T[]): T[] => {
  if (Array.isArray(intervals) && intervals.length < 1) {
    return [];
  }
  const typeStr = getType(intervals);
  const intervalSE = prepareInput(typeStr, intervals);
  return splitGen(splitIndexes, intervalSE).map(convertTo<T>(typeStr));
};

/**
 * Split `intervals` with `splitIndexes`.
 * Keeps extra object properties on `intervals`.
 * Curried function. Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 *
 * splitIndexes | interval(s) | result
 * --- | --- | ---
 * [2, 4] | { start: 0, end: 6, foo: 'bar' } | [{ start: 0, end: 2, foo: 'bar' }, { start: 2, end: 4, foo: 'bar' } { start: 4, end: 6, foo: 'bar' }]
 * [5] | [{ start: 0, end: 7 }, { start: 3, end: 8 }] | [{ start: 0, end: 5 }, { start: 5, end: 7 }, { start: 3, end: 5 }, { start: 5, end: 8 }]
 *
 * @param splitIndexes arg1: defines indexes where intervals are splitted.
 * @param intervals arg2: intervals to be splitted.
 * @returns array of intervals.
 */
export function split<T extends interval>(splitIndexes: roat<number>, interv: T | roat<T>): T[];
export function split<T extends interval>(splitIndexes: roat<number>): (interv: T | roat<T>) => T[];
export function split<T extends interval>(splitIndexes: roat<number>, interv?: T | roat<T>): any {
  switch (arguments.length) {
    case 1:
      return (tt2: T | T[]): T[] => {
        return splitCurry<T>(splitIndexes, tt2);
      };
    case 2:
      return splitCurry<T>(splitIndexes, interv as T | T[]);
  }
}
