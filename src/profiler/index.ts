import { redis_debug } from 'config';
import { logCommand } from 'logger';

/**
 * Check if profiling is enabled for the given resource.
 */
export function shouldProfile(invokingResource: string): boolean {
  if (!redis_debug) return false;
  if (Array.isArray(redis_debug) && !redis_debug.includes(invokingResource)) return false;
  return true;
}

/**
 * Profile a single command execution.
 */
export function profileCommand(
  invokingResource: string,
  command: string,
  args: any[],
  executionTime: number
) {
  if (!shouldProfile(invokingResource)) return;
  logCommand(invokingResource, command, args, executionTime);
}

/**
 * Profile a batch of commands (e.g., from MULTI/EXEC).
 */
export function profileBatchCommands(
  invokingResource: string,
  commands: { command: string; args: any[] }[],
  executionTimes: number[]
) {
  if (!shouldProfile(invokingResource)) return;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const time = executionTimes[i] || 0;
    logCommand(invokingResource, cmd.command, cmd.args, time);
  }
}
