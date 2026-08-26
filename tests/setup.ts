import './helpers/mocks';

const g = globalThis as any;
const noop = () => {};

// database/index.ts installs a 1s config-refresh interval at import time; keep the test process
// from being held open by it.
globalThis.setInterval = (() => 0 as any) as typeof setInterval;

const convars: Record<string, string> = {};
const commands: Record<string, Function> = {};
const netHandlers: Record<string, Function> = {};
const eventHandlers: Record<string, Function[]> = {};
const cfxExports: Record<string, Function> = {};

let emitNetCalls: any[][] = [];
let emitCalls: any[][] = [];
let triggeredEvents: any[][] = [];

export function setConvar(name: string, value: string | number | boolean) {
  convars[name] = String(value);
}
export function clearConvars() {
  for (const key of Object.keys(convars)) delete convars[key];
}
export function getCommand(name: string) {
  return commands[name];
}
export function getNetHandler(name: string) {
  return netHandlers[name];
}
export function getEventHandlers(name: string) {
  return eventHandlers[name] ?? [];
}
export function getExport(name: string) {
  return cfxExports[name];
}
export function getExportNames() {
  return Object.keys(cfxExports);
}
export function getEmitNetCalls() {
  return emitNetCalls;
}
export function getEmitCalls() {
  return emitCalls;
}
export function getTriggeredEvents() {
  return triggeredEvents;
}

export function resetNatives() {
  clearConvars();
  emitNetCalls = [];
  emitCalls = [];
  triggeredEvents = [];

  g.GetConvar = (name: string, fallback: string) => convars[name] ?? fallback;
  g.GetConvarInt = (name: string, fallback: number) =>
    convars[name] !== undefined ? parseInt(convars[name], 10) : fallback;
  g.SetConvar = (name: string, value: string) => setConvar(name, value);

  g.GetCurrentResourceName = () => 'redisfx';
  g.GetInvokingResource = () => 'test-resource';
  g.GetResourceState = () => 'started';
  g.GetResourceMetadata = () => undefined;
  g.GetNumResourceMetadata = () => 0;

  g.ScheduleResourceTick = noop;
  g.LoadResourceFile = () => '';

  g.RegisterCommand = (name: string, handler: Function) => (commands[name] = handler);
  g.on = (name: string, handler: Function) => {
    (eventHandlers[name] ??= []).push(handler);
  };
  g.onNet = (name: string, handler: Function) => (netHandlers[name] = handler);
  g.emitNet = (...args: any[]) => emitNetCalls.push(args);
  g.emit = (...args: any[]) => emitCalls.push(args);
  g.TriggerEvent = (...args: any[]) => triggeredEvents.push(args);
  g.IsPlayerAceAllowed = () => false;

  g.source = 0;

  // `global.exports(name, fn)` registers; `global.exports.redisfx` reads back.
  const exportsFn = ((name: string, fn: Function) => {
    cfxExports[name] = fn;
  }) as any;
  exportsFn.redisfx = cfxExports;
  g.exports = exportsFn;
  g.global = g;
}

resetNatives();

export {};
