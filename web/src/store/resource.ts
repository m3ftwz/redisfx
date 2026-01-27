import { writable } from 'svelte/store';

export interface CommandData {
  date: number;
  command: string;
  args?: any[];
  executionTime: number;
  slow?: boolean;
}

export const commands = writable<CommandData[]>([]);

export const resourceData = writable<{
  resourceCommandsCount: number;
  resourceSlowCommands: number;
  resourceTime: number;
}>({
  resourceCommandsCount: 0,
  resourceSlowCommands: 0,
  resourceTime: 0,
});

export const filterData = writable({ search: '', page: 0 });
