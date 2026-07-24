# Quick JSON5

Fast JSON5 parser and serializer.

* Written in pure TypeScript (JavaScript)
* Parses up to 10x faster than reference JSON5 implementation
* Tested for 100% compliance with the official [JSON5 specification](https://spec.json5.org/)
* Fully supports `replacer` and `space` properties in `stringify`, and `reviver` in `parse` (including the new `context` callback argument)
* Support several extensions to the JSON5 standard (optional)
* Improved validation and error reporting. Errors embed machine-readable positional metadata
* No external dependencies

## Support for extended numeric literals, beyond JSON5 (optional)

Parser also supports additional numeric literal syntax added in later versions of ECMAScript:

* Octal literals (`0o1234567`), and binary literals (`0b1001011`). Introduced in ES2015
* `BigInt` numeric literals (`123412341234n`). Introduced in ES2020
* Underscore separators in numeric literals (`123_456_789`, `123.456_789`, `0b0110_1101`). Introduced in ES2021

Enabling these extensions requires the `enableJson5Extensions` option to be set to `true` in the `options` argument for the `parseJSON5` and `stringifyJSON5` methods.

## Usage examples

Installation:
```
npm install quick-json5
```

JSON5 serializer and parser:
```ts
import { stringifyJSON5, parseJSON5 } from 'quick-json5'

const json5Str = stringifyJSON5({ 'hello': 123 })
const parsedObject = parseJSON5(json5Str)
```

JSON5 serializer and parser with extensions enabled:
```ts
import { stringifyJSON5, parseJSON5 } from 'quick-json5'

const options ={ enableJson5Extensions: true }

const json5Str = stringifyJSON5({ 'hello': 12356123456123456n }, undefined, 4, options)
const parsedObject = parseJSON5(json5Str, undefined, options)
```

Plain JSON serializer and parser:
```ts
import { stringifyJSON, parseJSON } from 'quick-json5'

const jsonStr = stringifyJSON({ 'hello': 123 })
const parsedObject = parseJSON(jsonStr)
```

## License

MIT
