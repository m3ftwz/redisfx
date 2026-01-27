# FiveMRedis exports wrapper for FiveM

Types are fully supported and you will get intellisense on the `fivemredis` object when using it.

## Installation

```yaml
# With pnpm
pnpm add @m3ftwz/fivemredis

# With Yarn
yarn add @m3ftwz/fivemredis

# With npm
npm install @m3ftwz/fivemredis
```

## Usage

Import as module:

```js
import { fivemredis } from '@m3ftwz/fivemredis';
```

Import with require:

```js
const { fivemredis } = require('@m3ftwz/fivemredis');
```

## Examples

```js
// Callback style
fivemredis.get('player:1:name', (result) => {
    console.log(result)
})

// Promise style
fivemredis.get('player:1:name').then((result) => {
    console.log(result)
}).catch(console.error)

// Async/await
const result = await fivemredis.get('player:1:name').catch(console.error)
console.log(result)

// Hash operations
await fivemredis.hset('player:1', 'money', 1000)
const money = await fivemredis.hget('player:1', 'money')

// Set with expiry
await fivemredis.set('session:abc', 'data', { EX: 3600 })
```

## License

LGPL-3.0
