import test from 'ava';

import { IntervalAR, IntervalFT, IntervalSE } from './data.structures';
import {
  complement,
  intersect,
  isAfter,
  isBefore,
  isDuring,
  isEnding,
  isMeeting,
  isOverlapping,
  isStarting,
  substract,
  unify,
} from './lib';

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

const testFnInputs = (
  i1: IntervalSE | IntervalSE[],
  i2: IntervalSE | IntervalSE[],
  fn: (...n: any[]) => any
) => {
  const res = fn(i1)(i2);
  const res2 = fn(prepareInput(i1, convertSEtoFT), prepareInput(i2, convertSEtoFT));
  const res3 = fn(prepareInput(i1, convertSEtoAR), prepareInput(i2, convertSEtoAR));
  return [res, res2, res3];
};

const testFnToBoolean = (
  i1: IntervalSE | IntervalSE[],
  i2: IntervalSE | IntervalSE[],
  fn: (...n: any[]) => any,
  testOutputFn: (n: any) => void
): void => {
  const [res, res2, res3] = testFnInputs(i1, i2, fn);
  testOutputFn(res);
  testOutputFn(res2);
  testOutputFn(res3);
};

const testFnToIntervals = (
  i1: IntervalSE | IntervalSE[],
  i2: IntervalSE | IntervalSE[],
  fn: (...n: any[]) => any,
  testOutputFn: (n: any) => void,
  t: any
): void => {
  const [res, res2, res3] = testFnInputs(i1, i2, fn);
  testOutputFn(res);
  testOutputFn(prepareOutput(res2, convertFTtoSE));
  testOutputFn(prepareOutput(res3, convertARtoSE));
  t.throws(fn.bind(null, [{ test: 1 }], { test: 1 }), 'Unrecognized interval format');
};

test('will find during', t => {
  const i1 = { start: 1, end: 8 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isDuring, testOutputFn);
});

test('will not find during', t => {
  const i1 = { start: 0, end: 9 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isDuring, testOutputFn);
});

test('will find ending', t => {
  const i1 = { start: 1, end: 8 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isEnding, testOutputFn);
  testFnToBoolean(i2, i1, isEnding, testOutputFn);
});

test('will not find ending', t => {
  const i1 = { start: 0, end: 5 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isEnding, testOutputFn);
});

test('will find starting', t => {
  const i1 = { start: 0, end: 5 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isStarting, testOutputFn);
  testFnToBoolean(i2, i1, isStarting, testOutputFn);
});

test('will not find starting', t => {
  const i1 = { start: 1, end: 5 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isStarting, testOutputFn);
});

test('will find after', t => {
  const i1 = { start: 5, end: 8 };
  const i2 = { start: 0, end: 5 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isAfter, testOutputFn);
});

test('will not find after', t => {
  const i1 = { start: 0, end: 5 };
  const i2 = { start: 6, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isAfter, testOutputFn);
});

test('will find before', t => {
  const i1 = { start: 0, end: 5 };
  const i2 = { start: 5, end: 8 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isBefore, testOutputFn);
});

test('will not find before', t => {
  const i1 = { start: 6, end: 8 };
  const i2 = { start: 0, end: 5 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isBefore, testOutputFn);
});

test('will find meeting', t => {
  const i1 = { start: 2, end: 5 };
  const i2 = { start: 5, end: 8 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isMeeting, testOutputFn);
  testFnToBoolean(i2, i1, isMeeting, testOutputFn);
});

test('will not find meeting when overlapping', t => {
  const i1 = { start: 2, end: 5 };
  const i2 = { start: 3, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isMeeting, testOutputFn);
});

test('will not find meeting when gap', t => {
  const i1 = { start: 2, end: 5 };
  const i2 = { start: 6, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isMeeting, testOutputFn);
});

test('will find overlapping with arrays', t => {
  const i1 = [{ start: 0, end: 5 }, { start: 10, end: 15 }];
  const i2 = [{ start: 8, end: 11 }];
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isOverlapping, testOutputFn);
});

test('will not find overlapping with interval and empty array', t => {
  const i1 = { start: 10, end: 15 };
  const i2: IntervalSE[] = [];
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isOverlapping, testOutputFn);
});

test('will not find overlapping with arrays', t => {
  const i1 = [{ start: 0, end: 5 }, { start: 10, end: 15 }];
  const i2 = [{ start: 6, end: 9 }];
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isOverlapping, testOutputFn);
});

test('will substract two arrays', t => {
  const base = [{ start: 0, end: 10 }, { start: 12, end: 20 }];
  const mask = [{ start: 1, end: 3 }, { start: 8, end: 13 }, { start: 18, end: 22 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 3);
    t.true(res[0].start === 0 && res[0].end === 1);
    t.true(res[1].start === 3 && res[1].end === 8);
    t.true(res[2].start === 13 && res[2].end === 18);
  };
  testFnToIntervals(base, mask, substract, testOutputFn, t);
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
  testFnToIntervals(boundaries, intervals, complement, testOutputFn, t);
});

test('will return complement when boundaries are included in intervals', t => {
  const intervals = [{ start: 1, end: 2 }, { start: 5, end: 7 }, { start: 6, end: 8 }];
  const boundaries = { start: 2, end: 6 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 2 && res[0].end === 5);
  };
  testFnToIntervals(boundaries, intervals, complement, testOutputFn, t);
});

test('will return interval corresponding to boundaries when empty interval', t => {
  const intervals: IntervalSE[] = [];
  const boundaries = { start: 0, end: 10 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 0 && res[0].end === 10);
  };
  testFnToIntervals(boundaries, intervals, complement, testOutputFn, t);
});

test('will unify two arrays', t => {
  const i1 = [{ start: 1, end: 2 }, { start: 7, end: 9 }];
  const i2 = [{ start: 4, end: 8 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 2);
    t.true(res[0].start === 1 && res[0].end === 2);
    t.true(res[1].start === 4 && res[1].end === 9);
  };
  testFnToIntervals(i1, i2, unify, testOutputFn, t);
});

test('will intersect an array with an interval', t => {
  const r1 = [{ start: 0, end: 5 }, { start: 7, end: 9 }, { start: 11, end: 15 }];
  const r2 = { start: 3, end: 8 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res[0].start === 3 && res[0].end === 5);
    t.true(res[1].start === 7 && res[1].end === 8);
  };
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
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
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
  testFnToIntervals(
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
  testFnToIntervals(i1, i2, intersect, testOutputFn, t);
});

test('will intersect two intervals', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = { start: 3, end: 6 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 3 && res[0].end === 5);
  };
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
});

test('will intersect an interval and an array', t => {
  const r1 = { start: 0, end: 5 };
  const r2 = [{ start: 1, end: 2 }, { start: 5, end: 10 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 1 && res[0].end === 2);
  };
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
});
