import { scheduleTick } from '../utils/scheduleTick';
import { sleep } from '../utils/sleep';
import { client } from './pool';

(Symbol as any).dispose ??= Symbol('Symbol.dispose');

// Special command mappings for node-redis v4 (most use UPPERCASE directly)
const COMMAND_MAP: Record<string, string> = {
  'ZRANGEWITHSCORES': 'zRangeWithScores',
  'SRANDMEMBERCOUNT': 'sRandMemberCount',
};

// Serialize argument for sendCommand (raw Redis protocol)
function serializeArg(arg: any): string {
  if (arg === null || arg === undefined) {
    return '';
  }
  if (typeof arg === 'object') {
    return JSON.stringify(arg);
  }
  return String(arg);
}

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

    const methodName = COMMAND_MAP[command] || command;
    const redisClient = client as any;

    if (typeof redisClient[methodName] === 'function') {
      return await redisClient[methodName](...args);
    }

    // Fallback to sendCommand for any command
    return await client.sendCommand([command, ...args.map(serializeArg)]);
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
      const methodName = COMMAND_MAP[command] || command;

      if (typeof (multi as any)[methodName] === 'function') {
        (multi as any)[methodName](...args);
      } else {
        multi.addCommand([command, ...args.map(serializeArg)]);
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
