import test from 'ava';

import { IntervalFT, IntervalSE } from './data.structures';
import { intersect } from './lib';

const prepareInput = (i1: IntervalSE | IntervalSE[], convertFn: (i: IntervalSE) => any) => {
  if (Array.isArray(i1)) {
    return i1.map(convertFn);
  }
  return convertFn(i1);
};

const prepareOutput = (i1: IntervalSE | IntervalSE[], convertFn: (i: any) => any) => {
  if (Array.isArray(i1)) {
    return i1.map(convertFn);
  }
  return convertFn(i1);
};

const convertFTtoSE = (r: IntervalFT): IntervalSE => ({ start: r.from, end: r.to });
const convertSEtoFT = (r: IntervalSE): IntervalFT => ({ from: r.start, to: r.end });

const testFn = (
  i1: IntervalSE | IntervalSE[],
  i2: IntervalSE | IntervalSE[],
  fn: (...n: any[]) => any,
  testOutputFn: (n: any) => void,
  t: any
): void => {
  const res = fn(i1, i2);
  const res2 = prepareOutput(
    fn(prepareInput(i1, convertSEtoFT), prepareInput(i2, convertSEtoFT)),
    convertFTtoSE
  );
  testOutputFn(res);
  testOutputFn(res2);
  t.throws(fn.bind(null, [{ test: 1 }], { test: 1 }), 'Unrecognized interval format');
};

test('will intersect an array with an interval', t => {
  const r1 = [{ start: 0, end: 5 }, { start: 7, end: 9 }];
  const r2 = { start: 3, end: 8 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res[0].start === 3 && res[0].end === 5);
    t.true(res[1].start === 7 && res[1].end === 8);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});

test('will intersect two arrays', t => {
  const r1 = [
    { start: 0, end: 5 },
    { start: 7, end: 9 },
    { start: 11, end: 15 },
    { start: 18, end: 22 },
    { start: 25, end: 42 },
  ];
  const r2 = [{ start: 3, end: 6 }, { start: 8, end: 10 }, { start: 20, end: 21 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 3);
    t.true(res[0].start === 3 && res[0].end === 5);
    t.true(res[1].start === 8 && res[1].end === 9);
    t.true(res[2].start === 20 && res[2].end === 21);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});

test('will intersect two intervals', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = { start: 3, end: 6 };
  const testOutputFn = (res: IntervalSE): void => {
    t.true(res.start === 3 && res.end === 5);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});

test('will intersect an interval and an array', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = [{ start: 1, end: 2 }, { start: 5, end: 10 }];
  const testOutputFn = (res: IntervalSE): void => {
    t.true(res.start === 1 && res.end === 2);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});
