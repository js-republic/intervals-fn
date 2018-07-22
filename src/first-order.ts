export const pipeTwo = (f, g) => (...args) => g(f(...args));
export const pipe = (...fns) => fns.reduce(pipeTwo);
export const dissoc = (prop, obj) => {
  const res = { ...obj };
  delete res[prop];
  return res;
};
export const curry = fn => {
  return (...args) => {
    return fn.bind(undefined, ...args);
  };
};