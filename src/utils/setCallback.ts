import type { CFXCallback } from '../types';

export const setCallback = (parameters?: any | CFXCallback, cb?: CFXCallback) => {
  if (cb && typeof cb === 'function') return cb;
  if (parameters && typeof parameters === 'function') return parameters;
};
