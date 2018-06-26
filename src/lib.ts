import {
  any,
  aperture,
  applySpec,
  concat,
  converge,
  dissoc,
  drop,
  dropWhile,
  either,
  groupWith,
  head,
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
import { IntervalAR, IntervalFT, IntervalSE, roat } from './data.structures';

const dissocMany = (...props: string[]) => {
  return pipe.apply(null, props.map(p => dissoc(p))); // Workaround for TS issue #4130
};

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
// tslint:disable:prefer-object-spread
export const convertFTtoSE = <T extends IntervalFT>(r: T): Omit<T, 'from' | 'to'> & IntervalSE =>
  dissocMany('from', 'to')(Object.assign({}, r, { start: r.from, end: r.to }));

export const convertARtoSE = ([start, end]: IntervalAR): IntervalSE => ({ start, end });

export const convertSEtoFT = <T extends IntervalSE>(r: T): Omit<T, 'start' | 'end'> & IntervalFT =>
  dissocMany('start', 'end')(Object.assign({}, r, { from: r.start, to: r.end }));

export const convertSEtoAR = (r: IntervalSE): IntervalAR => [r.start, r.end];

/**
 * Complement of `intervals` bounded to `boundaries`. Convert space between two consecutive intervals into interval.
 * Keeps extra object properties on `boundaries`.
 * intervals array has to be sorted.
 * Doesn't mutate input. Output keeps input's structure.
 *
 * boundaries | interval(s) | result
 * --- | --- | ---
 * { start: 0, end: 10} | [{ start: 3, end: 7 }] | [{ start: 0, end: 3 }, { start: 7, end: 10 }]
 * { start: 0, end: 10} | [{ start: 2, end: 4 }, { start: 7, end: 8 }] | [{ start: 0, end: 2 }, { start: 4, end: 7 }, { start: 8, end: 10 }]
 *
 * @param boundaries arg1: interval defining boundaries for the complement computation.
 * @param intervals arg2: array of intervals that complement the result.
 * @returns array of intervals.
 */
export const complement = <T extends IntervalSE>(
  boundaries: T,
  intervals: roat<IntervalSE>
): T[] => {
  const { start, end, ...rest }: IntervalSE = boundaries as any; // See TypeScript/pull/13288 TypeScript/issues/10727
  const prepRanges: IntervalSE[] = [
    { start: -Infinity, end: start },
    ...intervals,
    { start: end, end: Infinity },
  ];
  return reject<IntervalSE | null>(
    isNil,
    aperture(2, prepRanges).map(
      ([r1, r2]) => (r1.end >= r2.start ? null : { start: r1.end, end: r2.start, ...rest })
    )
  ) as T[];
};

/**
 * Test if `intervalA` overlaps with `intervalB`.
 *
 * intervalA | intervalB | result
 * --- | --- | ---
 * { start: 0, end: 10} | { start: 3, end: 7 } | true
 * { start: 0, end: 5} | { start: 5, end: 7 } | false
 *
 * @param intervalA arg1: interval
 * @param intervalB arg2: interval
 * @returns true if overlaps
 */
export const isOverlappingSimple = (a: IntervalSE, b: IntervalSE): boolean => {
  return b.start < a.end && b.end > a.start;
};

const isOverlappingNum = (a: IntervalSE, b: number): boolean => {
  return a.start < b && b < a.end;
};

const beforeOrAdjTo = (afterInt: IntervalSE) => (beforeInt: IntervalSE) =>
  beforeInt.end <= afterInt.start;

/**
 * Test if `intervalA` overlaps with `intervalB`.
 *
 * Accept array of intervals.
 * Intervals arrays have to be sorted.
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
export const isOverlapping = (
  intervalsA: roat<IntervalSE>,
  intervalsB: roat<IntervalSE>
): boolean => {
  if ([intervalsA, intervalsB].some(isEmpty)) {
    return false;
  }
  const intsA = intervalsA[0];
  const newInters2 = dropWhile(beforeOrAdjTo(intsA), intervalsB);
  if (isEmpty(newInters2)) {
    return false;
  }
  const intsB = newInters2[0];
  return isOverlappingSimple(intsA, intsB) ? true : isOverlapping(drop(1, intervalsA), newInters2);
};

/**
 * Test if `intervalA` is adjacent to (meets) `intervalB`.
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
export const isMeeting = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.end || a.end === b.start;
};

/**
 * Test if `intervalA` is before or adjacent `intervalB`.
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
export const isBefore = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.end <= b.start;
};

/**
 * Test if `intervalA` is after or adjacent `intervalB`.
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
export const isAfter = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start >= b.end;
};

/**
 * Test if `intervalA` and `intervalB` share the same starting point.
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
export const isStarting = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.start;
};

/**
 * Test if `intervalA` and `intervalB` share the same ending point.
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
export const isEnding = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.end === b.end;
};

/**
 * Test if `intervalA` occurs in `intervalB`. `intervalsB` act as boundaries. Can share starting and/or ending point.
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
export const isDuring = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start >= b.start && a.end <= b.end;
};

/**
 * Test if `intervalA` is equivalent to `intervalB`.
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
export const isEqual = (a: IntervalSE, b: IntervalSE): boolean => {
  return a.start === b.start && a.end === b.end;
};

const propFromNthArg = (n: number, propName: string) =>
  pipe(
    nthArg(n),
    prop(propName)
  );
const maxEnd = (ranges: IntervalSE[]) => ranges.reduce((a, b) => (a.end > b.end ? a : b));

const simplifyPipe = pipe(
  groupWith(either(isOverlappingSimple, isMeeting)),
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
 * Intervals array has to be sorted.
 *
 * Doesn't mutate input. Output keeps input's structure.
 *
 * | intervals A | result |
 * | ----------- | ------ |
 * | [{ start: 3, end: 9 }, { start: 9, end: 13 }, { start: 11, end: 14 }] | [{ start: 3, end: 14 }] |
 *
 * @param intervalA
 */
export const simplify = <T extends IntervalSE>(intervals: roat<T>) =>
  simplifyPipe([...intervals]) as T[];

const sortByStart = sortBy<IntervalSE>(prop('start'));

const unifyPipe = pipe(
  concat as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[],
  sortByStart,
  simplify
) as (a: IntervalSE[], b: IntervalSE[]) => IntervalSE[];

/**
 * Union of `intervals`.
 *
 * Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 * Intervals arrays have to be sorted.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * [{ start: 0, end: 4}] | [{ start: 3, end: 7 }, { start: 9, end: 11 }] | [{ start: 0, end: 7 }, { start: 9, end: 11 }]
 *
 * @param intervalA arg1: array of intervals
 * @param intervalB arg2: array of intervals
 * @returns union of `arg1` and `arg2`
 */
export const unify = <T extends IntervalSE>(intervalsA: roat<T>, intervalsB: roat<T>) =>
  unifyPipe([...intervalsA], [...intervalsB]);

const intersectUnfolderSeed = (
  i1: IntervalSE[],
  i2: IntervalSE[]
): [IntervalSE[], IntervalSE[]] => {
  const new1 = i1[0].end > i2[0].end ? i1 : drop(1, i1);
  const new2 = i2[0].end > i1[0].end ? i2 : drop(1, i2);
  return [new1, new2];
};

const intersectUnfolder = ([inters1, inters2]: [roat<IntervalSE>, roat<IntervalSE>]):
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

/**
 * Intersection of `intervals`. Does not simplify result. Keeps extra object properties on `intervalB`.
 *
 * `interalA` and `interalB` can have different structure.
 * Accept array of intervals. Doesn't mutate input. Output keeps `intervalB` structure.
 * Intervals arrays have to be sorted.
 *
 * interval(s) A | interval(s) B | result
 * --- | --- | ---
 * { from: 0, to: 4 } | { start: 3, end: 7, foo: 'bar' } | [{ start: 3, end: 4, foo: 'bar' }]
 * { start: 0, end: 10 } | [{ start: 2, end: 5}, { start: 5, end: 8}] | [{ start: 2, end: 5 }, { start: 5, end: 8 }]
 * [{ start: 0, end: 4 }, { start: 8, end: 11 }] | [{ start: 2, end: 9 }, { start: 10, end: 13 }] | [{ start: 2, end: 4 }, { start: 8, end: 9 }, { start: 10, end: 11 }]
 *
 * @param intervalA arg1: array of intervals
 * @param intervalB arg2: array of intervals
 * @returns intersection of `arg1` and `arg2`
 */
export const intersect = <T extends IntervalSE>(
  intervalsA: roat<IntervalSE>,
  intervalsB: roat<T>
): T[] => {
  return unfold(intersectUnfolder, [intervalsA, intervalsB] as [
    roat<IntervalSE>,
    roat<IntervalSE>
  ]).filter(i => i != null) as T[];
};

const minStart = (ranges: roat<IntervalSE>) => ranges.reduce((a, b) => (a.start < b.start ? a : b));

const mergeUnfolder = (mergeFn: (ints: any[]) => any) => (
  ints: roat<IntervalSE>
): false | [any, roat<IntervalSE>] => {
  if (!ints.length) {
    return false;
  }
  const start = minStart(ints).start;
  const withoutStart = ints
    .filter(a => a.end > start)
    .map(a => (a.start === start ? { ...a, start: a.end } : a));
  const end = minStart(withoutStart).start;
  const toMerge = ints.filter(a => isDuring({ start, end }, a));
  const next = { ...mergeFn(toMerge), start, end };
  return [
    next,
    ints.filter(a => a.end > end).map(a => (a.start <= end ? { ...a, start: end } : a)),
  ];
};

/**
 * Merge extra properties of all intervals inside `intervals`, when overlapping, with provided function `mergeFn`.
 * Can also be used to generate an array of intervals without overlaps
 *
 * Doesn't mutate input. Output keeps input's structure.
 * Interval array has to be sorted.
 *
 * parameter | value
 * --- | ---
 * mergeFn | `(a, b) => {...a, data: a.data + b.data }`
 * intervals | `[{ start: 0, end: 10, data: 5 }, { start: 4, end: 7, data: 100 }]`
 * result | `[{ start: 0, end: 4, data: 5 }, { start: 4, end: 7, data: 105 }, { start: 7, end: 10, data: 5 }]`
 * @param mergeFn arg1: function to merge extra properties of overlapping intervals
 * @param intervals arg2: intervals with extra properties.
 */
export const merge = <T extends IntervalSE>(
  mergeFn: (ints: any[]) => any,
  intervals: roat<T>
): T[] => {
  return unfold(mergeUnfolder(mergeFn), intervals) as T[];
};

const subtractInter = (mask: IntervalSE[], base: IntervalSE): IntervalSE[] => {
  return complement(base, mask);
};

/**
 * Subtact `base` with `mask`.
 * Keeps extra object properties on `base`.
 *
 * Accept array of intervals. Doesn't mutate input. Output keeps input's structure.
 * Intervals arrays have to be sorted.
 *
 * interval(s) base | interval(s) mask | result
 * --- | --- | ---
 * [{ start: 0, end: 4 }] | [{ start: 3, end: 7 }] | [{ start: 0, end: 3 }]
 * [{ start: 0, end: 4 }, { start: 8, end: 11 }] | [{ start: 2, end: 9 }, { start: 10, end: 13 }] | [{ start: 0, end: 2 }, { start: 9, end: 10 }]
 *
 * @param intervalA arg1: array of intervals
 * @param intervalB arg2: array of intervals
 * @returns intersection of `arg1` and `arg2`
 */
export const substract = <T extends IntervalSE>(base: roat<T>, mask: roat<IntervalSE>): T[] => {
  const intersection = intersect(mask, base);
  return unnest(
    base.map(b => subtractInter(intersection.filter(isOverlappingSimple.bind(null, b)), b))
  ) as T[];
};

const splitIntervalWithIndex = (int: IntervalSE, index: number): IntervalSE[] => {
  if (!isOverlappingNum(int, index)) {
    return [int];
  }
  return [{ ...int, start: int.start, end: index }, { ...int, start: index, end: int.end }];
};

/**
 * Split `intervals` with `splitIndexes`.
 * Keeps extra object properties on `intervals`.
 * Doesn't mutate input. Output keeps input's structure.
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
export const split = <T extends IntervalSE>(splits: roat<number>, intervals: roat<T>): T[] => {
  if (splits.length < 1 || intervals.length < 1) {
    return intervals as T[];
  }
  return unnest(
    intervals.map(int =>
      splits.reduce(
        (acc: IntervalSE[], i: number) => {
          const lastInt = acc.pop() as T;
          return [...acc, ...splitIntervalWithIndex(lastInt, i)];
        },
        [int]
      )
    )
  ) as T[];
};
