import { drop, dropWhile, isEmpty, unfold } from 'ramda';

import { interval, IntervalFT, IntervalSE } from './data.structures';

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

const sortByStart = (i1: IntervalSE, i2: IntervalSE) => i1.start - i2.start;

const prepareInput = (typeStr: string, i: interval | interval[]): IntervalSE[] => {
  if (Array.isArray(i)) {
    return i.map(convertFrom(typeStr));
  }
  return [convertFrom(typeStr)(i)];
};

const intersectUnfolder = (
  [inters1, inters2]: [IntervalSE[], IntervalSE[]]
): false | [IntervalSE, [IntervalSE[], IntervalSE[]]] => {
  if (isEmpty(inters1)) {
    return false;
  }
  const inter1 = inters1[0];
  const newInters2 = dropWhile(i => i.end < inter1.start, inters2);
  if (isEmpty(newInters2) || newInters2[0].start > inter1.end) {
    return false;
  }
  const inter2 = newInters2[0];
  return [
    { end: Math.min(inter1.end, inter2.end), start: Math.max(inter1.start, inter2.start) },
    [drop(1, inters1), newInters2],
  ];
};

const intersectGen = (intervalsA: IntervalSE[], intervalsB: IntervalSE[]): IntervalSE[] => {
  const intervalsAS = intervalsA.sort(sortByStart);
  const intervalsBS = intervalsB.sort(sortByStart);
  return unfold(intersectUnfolder, [intervalsAS, intervalsBS] as [IntervalSE[], IntervalSE[]]);
};

/**
 *
 * @returns Intersections of `interval1` and `interval2`
 */
export function intersect<T extends interval>(interval1: T, interval2: T): T;
export function intersect<T extends interval>(interval1: T, interval2: T[]): T[];
export function intersect<T extends interval>(interval1: T[], interval2: T): T[];
export function intersect<T extends interval>(interval1: T | T[], interval2: T | T[]): any {
  const typeStr = getType(interval1);
  const r1s = prepareInput(typeStr, interval1);
  const r2s = prepareInput(typeStr, interval2);
  const res = intersectGen(r1s, r2s).map(convertTo<T>(typeStr));
  return res.length > 1 ? res : res[0];
}
