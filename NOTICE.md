RedisFX is a derivative work of [oxmysql](https://github.com/overextended/oxmysql).

Copyright © 2021-2026 [Linden](https://github.com/thelindat), [Luke](https://github.com/LukeWasTakenn), [Dunak](https://github.com/dunak-debug) and oxmysql contributors — original work.

Copyright © 2026 [m3ftwz](https://github.com/m3ftwz) and RedisFX contributors — modifications.

The original source code is available at: https://github.com/overextended/oxmysql

---

## Modifications made to the original work

RedisFX keeps oxmysql's resource shell — the export layer, callback/promise conventions, logging,
profiler UI, update checker, and build/release tooling — and replaces the database it fronts:

- The `mysql2` connection pool was replaced with a single [node-redis](https://github.com/redis/node-redis) client (`src/database/pool.ts`).
- SQL query parsing, placeholder handling, transactions, and type casting were removed. There is no
  equivalent to `parseArguments`, `parseExecute`, `parseResponse`, `parseTransaction`, `typeCast`,
  or `validateResultSet`.
- The `mysql-async` and `ghmattimysql` compatibility shims were removed.
- The query surface (`query`, `single`, `scalar`, `insert`, `update`, `prepare`, `transaction`,
  `startTransaction`) was replaced with per-command Redis exports, `multi` for MULTI/EXEC, and
  `raw` for arbitrary commands.
- Pub/sub support was added on a dedicated subscriber connection (`src/database/pubsub.ts`).
- Convars were renamed from `mysql_*` to `redis_*`, and `redis_command_timeout` / `redis_resp` were
  added.

---

This project is licensed under the [LGPL-3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html) or later. A complete copy of the license is included in the [LICENSE](./LICENSE) file.

When incorporating this work into your own project, you must:

- Clearly credit the original authors and provide a link to the original project.
- Preserve all copyright, license, and attribution notices, including this NOTICE file.
- Document any modifications made to the original work.
- Include the full text of the LGPL-3.0 license with your distribution.
- License modified versions of this project under the LGPL-3.0 or later.

If oxmysql has been useful to you, please [consider sponsoring its continued development](https://ko-fi.com/thelindat).

---

## Frequently asked questions

### Can I redistribute modified versions of this project?

You may fork, modify, and redistribute this project, provided you comply with the license and preserve the same rights and freedoms for downstream recipients.

### Am I allowed to encrypt this project?

Recipients of this project must receive the complete corresponding source code and be able to install, modify, build, and run it. Distributing the project in a form — including through encryption, obfuscation, or other technical measures — that prevents recipients from exercising the rights granted by the license is not permitted.

### Can I sell a modified version of this project?

Commercial distribution is permitted, provided you comply with the terms of the license. However, recipients retain the same rights and freedoms under the license and may freely redistribute modified versions.
