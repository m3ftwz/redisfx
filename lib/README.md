# RedisFX exports wrapper for FiveM

Types are fully supported and you will get intellisense on the `redisfx` object when using it.

## Installation

```yaml
# With pnpm
pnpm add @m3ftwz/redisfx

# With Yarn
yarn add @m3ftwz/redisfx

# With npm
npm install @m3ftwz/redisfx
```

## Usage

Import as module:

```js
import { redisfx } from '@m3ftwz/redisfx';
```

Import with require:

```js
const { redisfx } = require('@m3ftwz/redisfx');
```

## Examples

```js
// Callback style
redisfx.get('player:1:name', (result) => {
    console.log(result)
})

// Promise style
redisfx.get('player:1:name').then((result) => {
    console.log(result)
}).catch(console.error)

// Async/await
const result = await redisfx.get('player:1:name').catch(console.error)
console.log(result)

// Hash operations
await redisfx.hset('player:1', 'money', 1000)
const money = await redisfx.hget('player:1', 'money')

// Set with expiry
await redisfx.set('session:abc', 'data', { EX: 3600 })
```

## License

LGPL-3.0
