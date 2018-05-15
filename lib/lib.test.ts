import test, { TestContext } from 'ava';
import { IntervalAR, IntervalFT, IntervalSE } from './data.structures';
import {
  complement,
  intersect,
  isAfter,
  isBefore,
  isDuring,
  isEnding,
  isEqual,
  isMeeting,
  isOverlapping,
  isStarting,
  merge,
  simplify,
  split,
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

const testInterval = (t: TestContext, i: IntervalSE, vals: [number, number], extra?: object) => {
  t.is(i.start, vals[0], `test interval: [${i.start}, ${i.end}]`);
  t.is(i.end, vals[1], `test interval: ${i}`);
  if (!extra) {
    return;
  }
  Object.entries(extra).forEach(([key, val]) => {
    t.true(
      i.hasOwnProperty(key) && Reflect.get(i, key) === val,
      `test interval: ${i}, with prop: ${key}:${val}`
    );
  });
};

interface IWithData {
  data: number;
}
type SEwithData = IntervalSE & IWithData;
type FTwithData = IntervalFT & IWithData;

const reduceWithData = (a: any, b: IWithData) => ({ ...a, data: a.data + b.data });

test('will merge arrays of ranges', t => {
  const i1 = [
    { start: 0, end: 2, data: 1 },
    { start: 5, end: 7, data: 2 },
    { start: 0, end: 4, data: 100 },
    { start: 6, end: 9, data: 200 },
  ];
  const mergeFn = (ranges: SEwithData[]) => ranges.reduce(reduceWithData);
  const merged = merge(mergeFn, i1);

  const testOutputFn = (res: SEwithData[]): void => {
    t.is(res.length, 5);
    t.true(res[0].start === 0 && res[0].end === 2 && res[0].data === 101);
    t.true(res[1].start === 2 && res[1].end === 4 && res[1].data === 100);
    t.true(res[2].start === 5 && res[2].end === 6 && res[2].data === 2);
    t.true(res[3].start === 6 && res[3].end === 7 && res[3].data === 202);
    t.true(res[4].start === 7 && res[4].end === 9 && res[4].data === 200);
  };
  testOutputFn(merged);
});

test('will merge arrays of FT ranges', t => {
  const i1 = [{ from: 0, to: 10, data: 5 }, { from: 4, to: 7, data: 10 }];
  const mergeFn = (ranges: FTwithData[]) => ranges.reduce(reduceWithData);
  const merged = merge(mergeFn)(i1);

  const testOutputFn = (res: FTwithData[]): void => {
    t.is(res.length, 3);
    t.true(res[0].from === 0 && res[0].to === 4 && res[0].data === 5);
    t.true(res[1].from === 4 && res[1].to === 7 && res[1].data === 15);
    t.true(res[2].from === 7 && res[2].to === 10 && res[2].data === 5);
  };
  testOutputFn(merged);
});

test('will simplify', t => {
  const i1 = [{ start: 0, end: 2 }, { start: 2, end: 10 }];
  const i2 = [[0, 8], [2, 10]] as Array<[number, number]>;
  const res1 = simplify(i1);
  const res2 = simplify(i2);
  t.true(res1.length === 1 && res1[0].start === 0 && res1[0].end === 10);
  t.true(res2.length === 1 && res2[0][0] === 0 && res2[0][1] === 10);
});

test('will find equal', t => {
  const i1 = { start: 0, end: 42 };
  const i2 = { start: 0, end: 42 };
  const testOutputFn = t.true.bind(t);
  testFnToBoolean(i1, i2, isEqual, testOutputFn);
});

test('will not find equal', t => {
  const i1 = { start: 0, end: 9 };
  const i2 = { start: 0, end: 8 };
  const testOutputFn = t.false.bind(t);
  testFnToBoolean(i1, i2, isEqual, testOutputFn);
});

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

test('will not find before when overlapping', t => {
  const i1 = { start: 0, end: 5 };
  const i2 = { start: 4, end: 8 };
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

test('substract will keep extra properties from base', t => {
  const base = [{ start: 0, end: 10, test: 'foo' }, { start: 12, end: 20, test: 'bar' }];
  const mask = [{ start: 1, end: 3 }, { start: 8, end: 13 }, { start: 18, end: 22 }];
  const res = substract(base, mask);
  t.true(res.length === 3);
  t.true(res[0].start === 0 && res[0].end === 1 && res[0].test === 'foo');
  t.true(res[1].start === 3 && res[1].end === 8 && res[1].test === 'foo');
  t.true(res[2].start === 13 && res[2].end === 18 && res[2].test === 'bar');
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

test('complement will keep additional properties from boundaries', t => {
  const intervals = [{ start: 1, end: 2 }, { start: 5, end: 7 }, { start: 6, end: 8 }];
  const boundaries = { start: 0, end: 10, test: 'foo' };
  const res = complement(boundaries, intervals);
  t.true(res.length === 3);
  t.true(res[0].start === 0 && res[0].end === 1 && res[0].test === 'foo');
  t.true(res[1].start === 2 && res[1].end === 5 && res[0].test === 'foo');
  t.true(res[2].start === 8 && res[2].end === 10 && res[0].test === 'foo');
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

test('will unify included range', t => {
  const i1 = { start: 0, end: 10 };
  const i2 = { start: 4, end: 8 };
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 0 && res[0].end === 10);
  };
  testFnToIntervals(i1, i2, unify, testOutputFn, t);
});

test('unify will simplify arrays', t => {
  const i1 = [{ start: 1, end: 4 }, { start: 7, end: 9 }];
  const i2 = [{ start: 3, end: 8 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 1);
    t.true(res[0].start === 1 && res[0].end === 9);
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

test('intersection will not simplify when there is inner intersection', t => {
  const r1 = [{ start: 1, end: 5 }];
  const r2 = [{ start: 1, end: 3 }, { start: 2, end: 5 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 2);
    t.true(res[0].start === 1 && res[0].end === 3);
    t.true(res[1].start === 2 && res[1].end === 5);
  };
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
  testFnToIntervals(r2, r1, intersect, testOutputFn, t);
});

test('intersection will not simplify when two intervals are touching', t => {
  const r1 = [{ start: 1, end: 10 }];
  const r2 = [{ start: 2, end: 5 }, { start: 5, end: 8 }];
  const testOutputFn = (res: IntervalSE[]): void => {
    t.true(res.length === 2);
    t.true(res[0].start === 2 && res[0].end === 5);
    t.true(res[1].start === 5 && res[1].end === 8);
  };
  testFnToIntervals(r1, r2, intersect, testOutputFn, t);
  testFnToIntervals(r2, r1, intersect, testOutputFn, t);
});


test('intersection will keep object properties', t => {
  const r1 = [{ start: 1, end: 5, test: 'foo' }];
  const r2 = [{ start: 1, end: 2, test: 'bar' }, { start: 2, end: 5, test: 'baz' }];
  const res = intersect(r1, r2);
  t.true(res.length === 2);
  t.true(res[0].test === 'bar');
  t.true(res[1].test === 'baz');
});

test('intersection will keep object properties when truncated', t => {
  const r1 = [{ start: 2, end: 5, test: 'foo' }, { start: 13, end: 16, test: 'foobar' }];
  const r2 = [{ start: 1, end: 8, test: 'bar' }, { start: 12, end: 15, test: 'baz' }];
  const res = intersect(r1, r2);
  t.true(res.length === 2);
  t.true(res[0].test === 'bar');
  t.true(res[1].test === 'baz');
});

test('will trash empty interval', t => {
  const r1 = [{ start: 0, end: 5, test: 'foo' }, { start: 8, end: 10, test: 'bar' }];
  const r2 = { start: 6, end: 9 };
  const res = intersect(r2, r1);
  t.is(res.length, 1);
  t.is(res[0].start, 8);
  t.is(res[0].end, 9);
  t.is(res[0].test, 'bar');
});

test('will split empty interval', t => {
  const r1: IntervalSE[] = [];
  const r2 = [5];
  const res = split(r2)(r1);
  t.is(res.length, 0);
});


test('will not split when no indexes', t => {
  const r1 = [{ start: 0, end: 7, test: 'foo' }];
  const r2: number[] = [];
  const res = split(r2, r1);
  t.is(res.length, 1);
  testInterval(t, res[0], [0, 7], { test: 'foo' });
});

test('will not split when no intersection', t => {
  const r1 = [{ start: 0, end: 7, test: 'foo' }, { start: 8, end: 10 }];
  const r2 = [9];
  const res = split(r2, r1);
  t.is(res.length, 3);
  testInterval(t, res[0], [0, 7], { test: 'foo' });
  testInterval(t, res[1], [8, 9]);
  testInterval(t, res[2], [9, 10]);
});
