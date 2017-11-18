import test from 'ava';

import { intersect } from './lib';

test('will intersect', t => {
  t.plan(2);
  const r1 = [{ start: 0, end: 5 }, { start: 7, end: 9 }];
  const r2 = { start: 3, end: 8 };
  const res = intersect(r1, r2);
  t.true(res[0].start === 3 && res[0].end === 5);
  t.true(res[1].start === 7 && res[1].end === 8);
});
