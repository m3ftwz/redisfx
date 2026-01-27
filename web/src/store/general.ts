import { derived, writable } from 'svelte/store';

export const visible = writable(false);

export const search = writable('');
let timeout: NodeJS.Timeout;
export const debouncedSearch = derived(search, (value, set: (value: string) => void) => {
  timeout = setTimeout(() => set(value), 500);
  return () => clearTimeout(timeout);
});

export const resources = writable<string[]>([]);

export const filteredResources = derived(
  [resources, debouncedSearch],
  ([$resources, $debouncedSearch], set: (value: string[]) => void) => {
    if ($debouncedSearch === '' || !$debouncedSearch) return set($resources);

    const query = $debouncedSearch.toLowerCase();

    return set($resources.filter((resource) => resource.toLowerCase().includes(query)));
  }
);

export const generalData = writable({
  commands: 0,
  timeExecuting: 0,
  slowCommands: 0,
});

export const chartData = writable<{ labels: string[]; data: { commands: number; time: number }[] }>({
  labels: [],
  data: [],
});
