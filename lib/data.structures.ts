export type interval = IntervalSE | IntervalFT | IntervalAR;

export interface IntervalSE {
  start: number;
  end: number;
}

export interface IntervalFT {
  from: number;
  to: number;
}

export type IntervalAR = [number, number];
