import { client } from './pool';
import { logCommand, logError } from '../logger';
import { sleep } from '../utils/sleep';
import { scheduleTick } from '../utils/scheduleTick';
import type { CFXCallback } from '../types';

// Command name mapping for node-redis v4 method names
const COMMAND_MAP: Record<string, string> = {
  'zrangewithscores': 'zRangeWithScores',
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

export async function executeCommand(
  invokingResource: string,
  command: string,
  args: any[],
  cb?: CFXCallback,
  isPromise?: boolean
) {
  while (!client) await sleep(0);

  scheduleTick();

  const startTime = performance.now();

  try {
    let result: any;

    if (command.startsWith('_RAW:')) {
      const rawCmd = command.slice(5);
      result = await client.sendCommand([rawCmd.toUpperCase(), ...args.map(serializeArg)]);
    } else {
      const cmdLower = command.toLowerCase();
      const methodName = COMMAND_MAP[cmdLower] || cmdLower;
      const redisClient = client as any;

      if (typeof redisClient[methodName] === 'function') {
        result = await redisClient[methodName](...args);
      } else {
        // Fallback to sendCommand for any command
        result = await client.sendCommand([command.toUpperCase(), ...args.map(serializeArg)]);
      }
    }

    const executionTime = performance.now() - startTime;
    const logCmd = command.startsWith('_RAW:') ? command.slice(5) : command;
    logCommand(invokingResource, logCmd, args, executionTime);

    if (cb) {
      cb(result);
    }

    return result;
  } catch (err: any) {
    const logCmd = command.startsWith('_RAW:') ? command.slice(5) : command;
    logError(invokingResource, cb, isPromise, err, logCmd, args);

    if (cb && isPromise) {
      return;
    }

    throw err;
  }
}

export async function executeMulti(
  invokingResource: string,
  commands: { command: string; args: any[] }[],
  cb?: CFXCallback,
  isPromise?: boolean
) {
  while (!client) await sleep(0);

  scheduleTick();

  const startTime = performance.now();

  try {
    const multi = client.multi();

    for (const cmd of commands) {
      if (!cmd || typeof cmd.command !== 'string') {
        throw new Error('Invalid command format: each command must have a "command" string property');
      }

      const cmdLower = cmd.command.toLowerCase();
      const methodName = COMMAND_MAP[cmdLower] || cmdLower;
      const cmdArgs = cmd.args || [];

      // Try to use typed method on multi for proper argument handling
      if (typeof (multi as any)[methodName] === 'function') {
        (multi as any)[methodName](...cmdArgs);
      } else {
        // Fallback to addCommand for unsupported commands
        multi.addCommand([cmd.command.toUpperCase(), ...cmdArgs.map(serializeArg)]);
      }
    }

    const results = await multi.exec();
    const executionTime = performance.now() - startTime;

    logCommand(invokingResource, 'MULTI/EXEC', commands, executionTime);

    if (cb) {
      cb(results);
    }

    return results;
  } catch (err: any) {
    logError(invokingResource, cb, isPromise, err, 'MULTI/EXEC', commands);

    if (cb && isPromise) {
      return;
    }

    throw err;
  }
}
