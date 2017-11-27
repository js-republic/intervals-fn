export type interval = IntervalSE | IntervalFT | IntervalAR;
export type roat<T> = ReadonlyArray<T>;
export type roai = ReadonlyArray<interval>;

export interface IntervalSE {
  start: number;
  end: number;
}

export interface IntervalFT {
  from: number;
  to: number;
}

export type IntervalAR = [number, number];
