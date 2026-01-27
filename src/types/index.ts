// Redis command response types
export type RedisResponse = string | number | null | (string | number | null)[] | Record<string, string>;

// Callback type for CFX exports
export type CFXCallback = (result: unknown, err?: string) => void;

// Generic parameters type
export type CFXParameters = any[];

// Redis SET command options
export interface SetOptions {
  EX?: number;    // Set expiry in seconds
  PX?: number;    // Set expiry in milliseconds
  EXAT?: number;  // Set expiry at Unix timestamp (seconds)
  PXAT?: number;  // Set expiry at Unix timestamp (milliseconds)
  NX?: boolean;   // Only set if key doesn't exist
  XX?: boolean;   // Only set if key exists
  KEEPTTL?: boolean; // Retain existing TTL
  GET?: boolean;  // Return old value
}

// Redis ZADD command options
export interface ZAddOptions {
  NX?: boolean;   // Only add new elements
  XX?: boolean;   // Only update existing elements
  GT?: boolean;   // Only update if new score > current score
  LT?: boolean;   // Only update if new score < current score
  CH?: boolean;   // Return number of changed elements
}

// Command data for logging
export interface CommandData {
  date: number;
  command: string;
  args?: any[];
  executionTime: number;
  slow?: boolean;
}

// Command log storage type
export type CommandLog = Record<string, CommandData[]>;
