import { describe, test, expect } from 'bun:test';
import { setCallback } from 'utils/setCallback';

describe('setCallback', () => {
  const cb = () => {};

  test('returns the explicit callback when one is provided', () => {
    expect(setCallback({ EX: 60 }, cb)).toBe(cb);
  });

  test('falls back to the options slot when it holds the callback', () => {
    expect(setCallback(cb)).toBe(cb);
  });

  test('returns undefined when there is no callback anywhere', () => {
    expect(setCallback({ EX: 60 })).toBeUndefined();
    expect(setCallback(undefined, undefined)).toBeUndefined();
  });

  test('a non-function explicit cb is ignored in favour of a function in the options slot', () => {
    expect(setCallback(cb, 'notfn' as any)).toBe(cb);
  });
});
