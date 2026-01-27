import { scheduleTick } from '../utils/scheduleTick';
import { sleep } from '../utils/sleep';
import { client } from './pool';

(Symbol as any).dispose ??= Symbol('Symbol.dispose');

export class RedisConnection {
  private multiMode: boolean = false;
  private multiQueue: { command: string; args: any[] }[] = [];

  constructor() {}

  async execute(command: string, ...args: any[]) {
    scheduleTick();

    if (this.multiMode) {
      this.multiQueue.push({ command, args });
      return 'QUEUED';
    }

    const cmd = command.toLowerCase();
    const redisClient = client as any;

    if (typeof redisClient[cmd] === 'function') {
      return await redisClient[cmd](...args);
    }

    // Fallback to sendCommand for any command
    return await client.sendCommand([command.toUpperCase(), ...args.map(String)]);
  }

  multi() {
    this.multiMode = true;
    this.multiQueue = [];
  }

  async exec() {
    if (!this.multiMode) {
      throw new Error('EXEC without MULTI');
    }

    this.multiMode = false;
    const multi = client.multi();

    for (const { command, args } of this.multiQueue) {
      const cmd = command.toLowerCase();
      if (typeof (multi as any)[cmd] === 'function') {
        (multi as any)[cmd](...args);
      } else {
        multi.addCommand([command.toUpperCase(), ...args.map(String)]);
      }
    }

    this.multiQueue = [];
    return await multi.exec();
  }

  discard() {
    this.multiMode = false;
    this.multiQueue = [];
  }

  [Symbol.dispose]() {
    // Redis client is shared, no cleanup needed per-connection
  }
}

export async function getConnection() {
  while (!client) await sleep(0);
  return new RedisConnection();
}
