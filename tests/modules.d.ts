/**
 * Test files append `?real` to a specifier to bypass the process-global `mock.module` stub and
 * load the actual implementation. TypeScript cannot resolve the query suffix, so the shape of
 * those two modules is declared here.
 */
declare module '*/database/pool.ts?real' {
  export const createRedisClient: () => Promise<void>;
  export const client: any;
  export const redisVersion: string;
}

declare module '*/database/pubsub.ts?real' {
  export const subscribe: (
    invokingResource: string,
    channels: string[],
    options: { pattern?: boolean; sharded?: boolean },
    cb?: (result: unknown, err?: string) => void,
    isPromise?: boolean,
  ) => Promise<true | undefined>;
  export const unsubscribe: typeof subscribe;
  export const releaseResource: (invokingResource: string) => Promise<void>;
  export const closeSubscriber: () => void;
}
