import { interval, IntervalFT, IntervalSE } from './data.structures';

const convertFrom = (typeStr: string) => (r: interval): IntervalSE => {
  switch (typeStr) {
    case 'IntervalSE':
      return r as IntervalSE;
    case 'IntervalFT':
      return convertFTtoSE(r as IntervalFT);
    default:
      return r as IntervalSE;
  }
};
const convertFTtoSE = (r: IntervalFT): IntervalSE => ({ start: r.from, end: r.to });
const convertSEtoFT = (r: IntervalSE): IntervalFT => ({ from: r.start, to: r.end });

const getType = (r: interval): string => {
  if (r.hasOwnProperty('start')) {
    return 'IntervalSE';
  }
  if (r.hasOwnProperty('from')) {
    return 'IntervalFT';
  }
  return '';
};

const convertTo = <T extends interval>(typeStr: string, r: IntervalSE): T => {
  switch (typeStr) {
    case 'IntervalSE':
      return r as T;
    case 'IntervalFT':
      return convertSEtoFT(r) as T;
    default:
      return r as T;
  }
};

/**
 *
 * @returns Intersections of `interval1` and `interval2`
 */
export function intersect<T extends interval>(interval1: T[], interval2: T): T[] {
  const typeStr = getType(interval2);
  const r1s = interval1.map(convertFrom(typeStr));
  const r2 = convertFrom(typeStr)(interval2);
  return r1s.filter(r1 => r1.start < r2.end && r1.end > r2.start).map(r =>
    convertTo<T>(typeStr, {
      end: Math.min(r2.end, r.end),
      start: Math.max(r2.start, r.start),
    })
  );
}
