export type interval = IntervalSE | IntervalFT;

export interface IntervalSE {
  start: number;
  end: number;
}

export interface IntervalFT {
  from: number;
  to: number;
}
