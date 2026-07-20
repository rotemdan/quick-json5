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

Enabling these extensions requires the `enableExtensions` option to be set to `true` in the `options` argument for `parse` and `stringify`.

## Extra: Plain JSON parser and serializer

As an extra, also includes an optimized pure JavaScript JSON parser and serializer, with performance approaching to the native `JSON.parse` and `JSON.stringify`.

The alternative parser can be useful when detailed metadata is required when handling errors. For example when implementing a syntax checker that needs to highlight the location of errors in the JSON file.

You can also use the source code as a starting point for implementing various custom JSON extensions, like adding support for comments (AKA "JSON with comments").

## Usage examples

Installation:
```
npm install quick-json5
```

JSON5 serializer and parser:
```ts
import * as JSON5 from 'quick-json5'

const json5Str = JSON5.stringify({ 'hello': 123 })
const parsedObject = JSON5.parse(json5Str)
```

JSON5 serializer and parser with extensions enabled:
```ts
import * as JSON5 from 'quick-json5'

const options = { enableExtensions: true }

const json5Str = JSON5.stringify({ 'hello': 12356123456123456n }, undefined, 4, options)
const parsedObject = JSON5.parse(json5Str, undefined, options)
```

Plain JSON serializer and parser:
```ts
import * as JSON5 from 'quick-json5'

const jsonStr = JSON5.stringifyJSON({ 'hello': 123 })
const parsedObject = JSON5.parseJSON(jsonStr)
```

## License

MIT
