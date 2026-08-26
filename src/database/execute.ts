import { client } from './pool';
import { logCommand, logError } from '../logger';
import { sleep } from '../utils/sleep';
import { scheduleTick } from '../utils/scheduleTick';
import { resolveCommand, serializeArgs } from '../utils/commands';
import type { CFXCallback } from '../types';

/**
 * Dispatches a single command. Prefers node-redis' typed method for the command (which knows how
 * to encode structured options) and falls back to the raw protocol for anything it does not model.
 */
async function dispatch(command: string, args: unknown[], raw?: boolean) {
  if (raw) return client.sendCommand(serializeArgs([command, ...args]));

  const method = resolveCommand(command);
  const redisClient = client as unknown as Record<string, Function>;

  if (typeof redisClient[method] === 'function') return redisClient[method](...args);

  return client.sendCommand(serializeArgs([command, ...args]));
}

export async function executeCommand(
  invokingResource: string,
  command: string,
  args: unknown[],
  cb?: CFXCallback,
  isPromise?: boolean,
  raw?: boolean,
) {
  while (!client) await sleep(0);

  scheduleTick();

  const startTime = performance.now();

  try {
    const result = await dispatch(command, args, raw);

    logCommand(invokingResource, command, args, performance.now() - startTime);

    if (cb) cb(result);

    return result;
  } catch (err: any) {
    logError(invokingResource, cb, isPromise, err, command, args);

    if (cb && isPromise) return;

    throw err;
  }
}

export async function executeMulti(
  invokingResource: string,
  commands: { command: string; args?: unknown[] }[],
  cb?: CFXCallback,
  isPromise?: boolean,
) {
  while (!client) await sleep(0);

  scheduleTick();

  const startTime = performance.now();

  try {
    if (!Array.isArray(commands)) {
      throw new Error('Expected an array of commands, e.g. [{ command: "SET", args: ["key", "value"] }].');
    }

    const multi = client.multi();

    for (const cmd of commands) {
      if (!cmd || typeof cmd.command !== 'string') {
        throw new Error('Invalid command format: each command must have a "command" string property.');
      }

      const cmdArgs = cmd.args === undefined ? [] : Array.isArray(cmd.args) ? cmd.args : [cmd.args];
      const method = resolveCommand(cmd.command);
      const queue = multi as unknown as Record<string, Function>;

      if (typeof queue[method] === 'function') queue[method](...cmdArgs);
      else multi.addCommand(serializeArgs([cmd.command, ...cmdArgs]));
    }

    const results = await multi.exec();

    logCommand(invokingResource, 'MULTI/EXEC', commands, performance.now() - startTime);

    if (cb) cb(results);

    return results;
  } catch (err: any) {
    logError(invokingResource, cb, isPromise, err, 'MULTI/EXEC', commands);

    if (cb && isPromise) return;

    throw err;
  }
}
