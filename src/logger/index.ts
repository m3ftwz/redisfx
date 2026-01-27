import { redis_debug, redis_log_size, redis_slow_query_warning, redis_ui } from '../config';
import type { CFXCallback, CommandData, CommandLog } from '../types';
import { redisVersion } from '../database';

let loggerResource = '';
let loggerService = GetConvar('redis_logger_service', '');

if (loggerService) {
  if (loggerService.startsWith('@')) {
    const [resource, ...path] = loggerService.slice(1).split('/');

    if (resource && path) {
      loggerResource = resource;
      loggerService = path.join('/');
    }
  } else loggerService = `logger/${loggerService}`;
}

export const logger =
  (loggerService &&
    new Function(LoadResourceFile(loggerResource || GetCurrentResourceName(), `${loggerService}.js`))()) ||
  (() => {});

export function logError(
  invokingResource: string,
  cb: CFXCallback | undefined,
  isPromise: boolean | undefined,
  err: any | string = '',
  command?: string,
  args?: any[],
  includeArgs?: boolean
) {
  const message = typeof err === 'object' ? err.message : err.replace(/SCRIPT ERROR: citizen:[\w\/\.]+:\d+[:\s]+/, '');

  const commandStr = command ? `${command}${args ? ' ' + JSON.stringify(args) : ''}` : '';
  const output = `${invokingResource} was unable to execute a Redis command!${commandStr ? `\nCommand: ${commandStr}` : ''}${
    includeArgs ? `\n${JSON.stringify(args)}` : ''
  }\n${message}`;

  TriggerEvent('fivemredis:error', {
    command: command,
    args: args,
    message: message,
    err: err,
    resource: invokingResource,
  });

  logger({
    level: 'error',
    resource: invokingResource,
    message: message,
    metadata: err,
  });

  if (cb && isPromise) {
    try {
      return cb(null, output);
    } catch (e) {}

    return;
  }

  console.error(output);
}

const logStorage: CommandLog = {};

export const logCommand = (
  invokingResource: string,
  command: string,
  args: any[],
  executionTime: number
) => {
  if (
    executionTime >= redis_slow_query_warning ||
    (redis_debug && (!Array.isArray(redis_debug) || redis_debug.includes(invokingResource)))
  ) {
    const argsStr = args && args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    console.log(
      `${redisVersion} ^3${invokingResource} took ${executionTime.toFixed(4)}ms to execute a command!\n${command}${argsStr}^0`
    );
  }

  if (!redis_ui) return;

  if (!logStorage[invokingResource]) logStorage[invokingResource] = [];
  else if (logStorage[invokingResource].length > redis_log_size) logStorage[invokingResource].splice(0, 1);

  logStorage[invokingResource].push({
    command,
    args,
    executionTime,
    date: Date.now(),
    slow: executionTime >= redis_slow_query_warning ? true : undefined,
  });
};

RegisterCommand(
  'redis',
  (source: number) => {
    if (!redis_ui) return;

    if (source < 1) {
      // source is 0 when received from the server
      console.log('^3This command cannot run server side^0');
      return;
    }

    let totalCommands: number = 0;
    let totalTime = 0;
    let slowCommands = 0;
    let chartData: { labels: string[]; data: { commands: number; time: number }[] } = { labels: [], data: [] };

    for (const resource in logStorage) {
      const commands = logStorage[resource];
      let totalResourceTime = 0;

      totalCommands += commands.length;
      totalTime += commands.reduce((totalTime, cmd) => (totalTime += cmd.executionTime), 0);
      slowCommands += commands.reduce((slowCount, cmd) => (slowCount += cmd.slow ? 1 : 0), 0);
      totalResourceTime += commands.reduce((totalResourceTime, cmd) => (totalResourceTime += cmd.executionTime), 0);
      chartData.labels.push(resource);
      chartData.data.push({ commands: commands.length, time: totalResourceTime });
    }

    emitNet(`fivemredis:openUi`, source, {
      resources: Object.keys(logStorage),
      totalCommands,
      slowCommands,
      totalTime,
      chartData,
    });
  },
  true
);

const sortCommands = (commands: CommandData[], sort: { id: 'command' | 'executionTime'; desc: boolean }) => {
  const sortedCommands = [...commands].sort((a, b) => {
    switch (sort.id) {
      case 'command':
        return a.command > b.command ? 1 : -1;
      case 'executionTime':
        return a.executionTime - b.executionTime;
      default:
        return 0;
    }
  });

  return sort.desc ? sortedCommands.reverse() : sortedCommands;
};

onNet(
  `fivemredis:fetchResource`,
  (data: {
    resource: string;
    pageIndex: number;
    search: string;
    sortBy?: { id: 'command' | 'executionTime'; desc: boolean }[];
  }) => {
    if (typeof data.resource !== 'string' || !IsPlayerAceAllowed(source as unknown as string, 'command.redis')) return;

    if (data.search) data.search = data.search.toLowerCase();

    const resourceLog = data.search
      ? logStorage[data.resource].filter((c) => c.command.toLowerCase().includes(data.search))
      : logStorage[data.resource];

    const sort = data.sortBy && data.sortBy.length > 0 ? data.sortBy[0] : false;
    const startRow = data.pageIndex * 10;
    const endRow = startRow + 10;
    const commands = sort ? sortCommands(resourceLog, sort).slice(startRow, endRow) : resourceLog.slice(startRow, endRow);
    const pageCount = Math.ceil(resourceLog.length / 10);

    if (!commands) return;

    let resourceTime = 0;
    let resourceSlowCommands = 0;
    const resourceCommandsCount = resourceLog.length;

    for (let i = 0; i < resourceCommandsCount; i++) {
      const cmd = resourceLog[i];

      resourceTime += cmd.executionTime;
      if (cmd.slow) resourceSlowCommands += 1;
    }

    emitNet(`fivemredis:loadResource`, source, {
      commands,
      pageCount,
      resourceCommandsCount,
      resourceSlowCommands,
      resourceTime,
    });
  }
);
