# Contributing to RedisFX

Thanks for taking the time to contribute — whether that is reporting a bug, suggesting an
improvement, or submitting code.

RedisFX is a derivative of [oxmysql](https://github.com/overextended/oxmysql); see [NOTICE.md](./NOTICE.md).
Changes that belong upstream (the export layer, logging, the web UI, release tooling) are usually
better contributed there first.

## Found a bug?

### Search for existing issues

Before creating a new issue, please search existing [issues](https://github.com/m3ftwz/redisfx/issues)
to see if it has already been reported.

### Create a new issue

If no open issue covers your bug, open a new one. Make sure to:

- Use the bug report template.
- Include a descriptive title and a clear description of the problem.
- Provide simple steps to reproduce.
- State your Redis server version (`redis-cli INFO server`) and your FXServer build.
- Include the relevant code sample and the full error output.

## Development

```sh
bun install          # install dependencies
bun run typecheck    # typecheck src/ and tests/
bun run test         # run the unit suite
bun run test:coverage # run with the 85% coverage gate CI enforces
bun run build        # build the web UI, the bundle, and lib/Redis.js
```

The unit suite has no external dependencies — the Redis client is faked in `tests/helpers/redis.ts`.

Note that `mock.module` in Bun is process-global, so every module stub lives in
`tests/helpers/mocks.ts` and is registered once from the preloaded `tests/setup.ts`. Registering a
second, differently shaped stub for the same module from an individual test file will break
unrelated files depending on execution order.

## Submitting a pull request

- Fork the repository and create a branch for your changes.
- Keep the change focused; unrelated formatting churn will be asked to be split out.
- Add or update tests — CI enforces 85% coverage.
- Run `bunx oxfmt .` so formatting matches the project.
- If you add or change an export, update `lib/Redis.ts`, `lib/Redis.lua`, and the README table in
  the same pull request. An export that only exists on one of those three is treated as incomplete.
