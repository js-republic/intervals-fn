import test from 'ava';

import { IntervalAR, IntervalFT, IntervalSE } from './data.structures';
import { complement, intersect, substract, unify } from './lib';

const prepareInput = (i1: IntervalSE | IntervalSE[], convertFn: (i: IntervalSE) => any) => {
  if (Array.isArray(i1)) {
    return i1.map(convertFn);
  }
  return convertFn(i1);
};

const prepareOutput = (i1: IntervalSE[], convertFn: (i: any) => any) => {
  return i1.map(convertFn);
};

const convertFTtoSE = (r: IntervalFT): IntervalSE => ({ start: r.from, end: r.to });
const convertARtoSE = ([start, end]: IntervalAR): IntervalSE => ({ start, end });
const convertSEtoFT = (r: IntervalSE): IntervalFT => ({ from: r.start, to: r.end });
const convertSEtoAR = (r: IntervalSE): IntervalAR => [r.start, r.end];

const testFn = (
  i1: IntervalSE | IntervalSE[],
  i2: IntervalSE | IntervalSE[],
  fn: (...n: any[]) => any,
  testOutputFn: (n: any) => void,
  t: any
): void => {
  const res = fn(i1)(i2);
  const res2 = prepareOutput(
    fn(prepareInput(i1, convertSEtoFT), prepareInput(i2, convertSEtoFT)),
    convertFTtoSE
  );
  const res3 = prepareOutput(
    fn(prepareInput(i1, convertSEtoAR), prepareInput(i2, convertSEtoAR)),
    convertARtoSE
  );
  testOutputFn(res);
  testOutputFn(res2);
  testOutputFn(res3);
  t.throws(fn.bind(null, [{ test: 1 }], { test: 1 }), 'Unrecognized interval format');
};

test('will substract two arrays', t => {
  const base = [{ start: 0, end: 10 }, { start: 12, end: 20 }];
  const mask = [{ start: 1, end: 3 }, { start: 8, end: 13 }, { start: 18, end: 22 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 3);
    t.true(res[0].start === 0 && res[0].end === 1);
    t.true(res[1].start === 3 && res[1].end === 8);
    t.true(res[2].start === 13 && res[2].end === 18);
  };
  testFn(base, mask, substract, testOutputFn, t);
});

test('will return complement', t => {
  const intervals = [{ start: 1, end: 2 }, { start: 5, end: 7 }, { start: 6, end: 8 }];
  const boundaries = { start: 0, end: 10 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 3);
    t.true(res[0].start === 0 && res[0].end === 1);
    t.true(res[1].start === 2 && res[1].end === 5);
    t.true(res[2].start === 8 && res[2].end === 10);
  };
  testFn(boundaries, intervals, complement, testOutputFn, t);
});

test('will return complement when boundaries are included in intervals', t => {
  const intervals = [{ start: 1, end: 2 }, { start: 5, end: 7 }, { start: 6, end: 8 }];
  const boundaries = { start: 2, end: 6 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 2 && res[0].end === 5);
  };
  testFn(boundaries, intervals, complement, testOutputFn, t);
});

test('will return interval corresponding to boundaries when empty interval', t => {
  const intervals: IntervalSE[] = [];
  const boundaries = { start: 0, end: 10 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 0 && res[0].end === 10);
  };
  testFn(boundaries, intervals, complement, testOutputFn, t);
});

test('will unify two arrays', t => {
  const i1 = [{ start: 1, end: 2 }, { start: 7, end: 9 }];
  const i2 = [{ start: 4, end: 8 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 2);
    t.true(res[0].start === 1 && res[0].end === 2);
    t.true(res[1].start === 4 && res[1].end === 9);
  };
  testFn(i1, i2, unify, testOutputFn, t);
});

test('will intersect an array with an interval', t => {
  const r1 = [{ start: 0, end: 5 }, { start: 7, end: 9 }, { start: 11, end: 15 }];
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
  testFn(
    [{ start: 0, end: 5 }, { start: 10, end: 15 }],
    [{ start: 7, end: 9 }],
    intersect,
    (res: IntervalSE[]) => {
      t.true(res.length === 0);
    },
    t
  );
});

test('will intersect correctly if one interval from arg1 intersects many from arg2', t => {
  const i1 = { start: 3, end: 7 };
  const i2 = [{ start: 0, end: 5 }, { start: 6, end: 8 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 2);
    t.true(res[0].start === 3 && res[0].end === 5);
    t.true(res[1].start === 6 && res[1].end === 7);
  };
  testFn(i1, i2, intersect, testOutputFn, t);
});

test('will intersect two intervals', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = { start: 3, end: 6 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 3 && res[0].end === 5);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});

test('will intersect an interval and an array', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = [{ start: 1, end: 2 }, { start: 5, end: 10 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 1 && res[0].end === 2);
  };
  testFn(r1, r2, intersect, testOutputFn, t);
});
