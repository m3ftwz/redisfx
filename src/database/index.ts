import { setDebug } from '../config';
import { sleep } from '../utils/sleep';
import { client, createRedisClient } from './pool';

setTimeout(async () => {
  setDebug();

  while (!client) {
    await createRedisClient();

    if (!client) await sleep(30000);
  }
});

setInterval(() => {
  setDebug();
}, 1000);

export * from './connection';
export * from './execute';
export * from './pool';
