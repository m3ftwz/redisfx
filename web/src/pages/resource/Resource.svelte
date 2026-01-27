<script lang="ts">
  import { fetchNui } from '../../utils/fetchNui';
  import Pagination from './components/Pagination.svelte';
  import CommandTable from './components/CommandTable.svelte';
  import ResourceHeader from './components/ResourceHeader.svelte';
  import { meta } from 'tinro';
  import { useNuiEvent } from '../../utils/useNuiEvent';
  import { commands, resourceData, type CommandData } from '../../store';
  import { debugData } from '../../utils/debugData';
  import { onDestroy } from 'svelte';
  import { filterData } from '../../store';
  import CommandSearch from './components/CommandSearch.svelte';
  import IconSearch from '@tabler/icons-svelte/dist/svelte/icons/IconSearch.svelte';

  let maxPage = 0;

  onDestroy(() => {
    $commands = [];
    $filterData.page = 0;
  });

  interface ResourceData {
    commands: CommandData[];
    pageCount: number;
    resourceCommandsCount: number;
    resourceSlowCommands: number;
    resourceTime: number;
  }

  debugData<ResourceData>([
    {
      action: 'loadResource',
      data: {
        commands: [
          { command: 'GET player:1:data', executionTime: 3, slow: false, date: Date.now() },
          { command: 'HGETALL player:1:inventory', executionTime: 23, slow: true, date: Date.now() },
          { command: 'SET player:1:online true EX 300', executionTime: 15, slow: false, date: Date.now() },
          { command: 'ZADD leaderboard 1500 player:1', executionTime: 122, slow: true, date: Date.now() },
        ],
        resourceCommandsCount: 3,
        resourceSlowCommands: 2,
        resourceTime: 1342,
        pageCount: 3,
      },
    },
  ]);

  useNuiEvent('loadResource', (data: ResourceData) => {
    maxPage = data.pageCount;
    $commands = data.commands;
    $resourceData = {
      resourceCommandsCount: data.resourceCommandsCount,
      resourceSlowCommands: data.resourceSlowCommands,
      resourceTime: data.resourceTime,
    };
  });
</script>

<div class="flex w-full flex-col justify-between">
  <div>
    <ResourceHeader />
    <CommandSearch icon={IconSearch} />
    <CommandTable />
  </div>
  <Pagination {maxPage} />
</div>
