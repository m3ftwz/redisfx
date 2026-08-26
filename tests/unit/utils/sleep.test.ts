import { describe, test, expect } from 'bun:test';
import { sleep } from 'utils/sleep';

describe('sleep', () => {
  test('resolves after the requested delay', async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  test('resolves on the next tick for a zero delay', async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});
