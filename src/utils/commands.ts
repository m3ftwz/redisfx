/**
 * node-redis exposes almost every command under its uppercase name (`client.GET`), so the
 * uppercase name we are given can normally be used directly. A handful of commands are only
 * reachable under a modifier-specific name and are mapped here.
 */
export const COMMAND_MAP: Record<string, string> = {
  ZRANGEWITHSCORES: 'ZRANGE_WITHSCORES',
  ZRANGEBYSCOREWITHSCORES: 'ZRANGEBYSCORE_WITHSCORES',
  ZREVRANGEWITHSCORES: 'ZREVRANGE_WITHSCORES',
  ZDIFFWITHSCORES: 'ZDIFF_WITHSCORES',
  // ZREVRANGE/ZREVRANGEBYSCORE have no typed method in node-redis v6 (superseded by ZRANGE REV);
  // they fall through to sendCommand, which the server still accepts.
  ZINTERWITHSCORES: 'ZINTER_WITHSCORES',
  ZUNIONWITHSCORES: 'ZUNION_WITHSCORES',
  ZRANDMEMBERCOUNT: 'ZRANDMEMBER_COUNT',
  ZRANDMEMBERCOUNTWITHSCORES: 'ZRANDMEMBER_COUNT_WITHSCORES',
  SRANDMEMBERCOUNT: 'SRANDMEMBER_COUNT',
  HRANDFIELDCOUNT: 'HRANDFIELD_COUNT',
  HRANDFIELDCOUNTWITHVALUES: 'HRANDFIELD_COUNT_WITHVALUES',
  SPOPCOUNT: 'SPOP_COUNT',
  OBJECTENCODING: 'OBJECT_ENCODING',
  CONFIGGET: 'CONFIG_GET',
  SCRIPTLOAD: 'SCRIPT_LOAD',
  FUNCTIONLOAD: 'FUNCTION_LOAD',
  CLIENTINFO: 'CLIENT_INFO',
  MEMORYUSAGE: 'MEMORY_USAGE',
  XGROUPCREATE: 'XGROUP_CREATE',
  XGROUPCREATECONSUMER: 'XGROUP_CREATECONSUMER',
  XGROUPDESTROY: 'XGROUP_DESTROY',
};

export function resolveCommand(command: string) {
  return COMMAND_MAP[command] ?? command;
}

/**
 * Flattens and stringifies arguments for the raw `sendCommand` path. Every Redis argument is a
 * bulk string on the wire, so node-redis rejects anything that is not a string or Buffer.
 */
export function serializeArgs(args: unknown[]): string[] {
  const out: string[] = [];

  for (const arg of args) {
    if (Array.isArray(arg)) {
      // A nested array is a variadic argument list (e.g. a key list), not a value to encode.
      out.push(...serializeArgs(arg));
      continue;
    }

    if (arg === null || arg === undefined) {
      throw new TypeError('Redis arguments cannot be null or undefined.');
    }

    if (Buffer.isBuffer(arg)) {
      out.push(arg as unknown as string);
      continue;
    }

    if (typeof arg === 'object') {
      out.push(arg instanceof Date ? arg.toISOString() : JSON.stringify(arg));
      continue;
    }

    out.push(String(arg));
  }

  return out;
}
