import { parseJSON } from '../parser/JsonParser.js'
import { deepEquals } from '../utilities/ObjectUtilities.js'

const log = console.log

export function testJsonParser() {
	for (const [source, expected] of testPairs) {
		let parsedObj: any

		try {
			parsedObj = parseJSON(source)
		} catch (e: any) {
			log(`Error when parsing:`)
			log(source)
			log(``)
			log(e.message)
		}

		if (!deepEquals(parsedObj, expected)) {
			log(`JSON not parsed correctly:`)
			log(source)

			return
		}
	}
}

export function testJsonParserInvalidInputs() {
	for (const invalidInput of invalidInputs) {
		let parsedObj: any

		try {
			parsedObj = parseJSON(invalidInput)
		} catch (e: any) {
			log(`Error when parsing:`)
			log(invalidInput)
			log(``)
			log(e.message)
			log(``)

			continue
		}

		throw new Error(`No error when parsing:\n ${invalidInput}\n`)
	}
}


const testPairs: [string, unknown][] = [
	['[1,2]', [1, 2]], // multiple elements

	// === String literals ===
	['"x"', 'x'], // simple string
	['""', ''], // empty string
	['"hello world"', 'hello world'], // basic string with spaces
	['"hello \\"world\\""', 'hello "world"'], // escaped quotes inside string
	['"line\\nbreak"', 'line\nbreak'], // escaped newline
	['"tab\\tcharacter"', 'tab\tcharacter'], // escaped tab
	['"backslash\\\\test"', 'backslash\\test'], // escaped backslash
	['"unicode \\u263A"', 'unicode ☺'], // unicode escape sequence
	['"surrogate pair: \\uD834\\uDD1E"', 'surrogate pair: 𝄞'], // surrogate pair unicode
	['"emoji: 😀"', 'emoji: 😀'], // literal emoji character
	['"中文"', '中文'], // Chinese characters
	['"Русский"', 'Русский'], // Cyrillic characters
	['"العربية"', 'العربية'], // Arabic characters
	['"𠜎"', '𠜎'], // supplementary plane CJK character

	// === Numbers ===
	['1234', 1234], // integer
	['1234.5678', 1234.5678], // float
	['0', 0], // zero
	['-0', -0], // negative zero
	['-123', -123], // negative integer
	['-123.456', -123.456], // negative float
	['1e10', 1e10], // positive exponent
	['-1e10', -1e10], // negative exponent
	['1E-10', 1e-10], // negative exponent with uppercase E
	['123.456e7', 123.456e7], // Decimal and exponent
	['123.456E7', 123.456E7], // Decimal and exponent
	['0.0', 0.0], // zero float
	['1.0e+2', 1.0e2], // positive exponent with plus sign
	['1.2345678901234567', 1.2345678901234567], // double precision limit
	['18446744073709551616', 18446744073709552000], // Number larger than MAX_SAFE_INTEGER - might lose precision
	['-18446744073709551616', -18446744073709552000], // Negative number larger than MAX_SAFE_INTEGER

	// === Booleans and null ===
	['true', true], // boolean true
	['false', false], // boolean false
	['null', null], // null literal

	// === Empty structures ===
	['{}', {}], // empty object
	['[]', []], // empty array
	['[[]]', [[]]], // nested empty array
	[' [ [ ] ] ', [[]]], // nested empty array with whitespace
	[' [ { } ] ', [{}]], // array with empty object, whitespace

	// === Arrays ===
	['[1]', [1]], // single element array
	['[1,2]', [1, 2]], // multiple elements
	['[1,[2,3]]', [1, [2, 3]]], // nested arrays
	['[true,false,null]', [true, false, null]], // mixed literals
	['[ "a", "b", "c" ]', ['a', 'b', 'c']], // string array with spaces
	[' [1 , 2 , 3 ] ', [1, 2, 3]], // number array with whitespace
	['[{"a":1},{"b":2}]', [{ a: 1 }, { b: 2 }]], // array of objects

	// === Objects ===
	['{"a":1}', { a: 1 }], // simple object
	['{"abc":1,"def":2}', { abc: 1, def: 2 }], // multiple key-value pairs
	['{"":true,"a":6.123}', { '': true, a: 6.123 }], // empty string key and mixed values
	['{"nested":{"x":1,"y":[2,3]}}', { nested: { x: 1, y: [2, 3] } }], // nested object and array
	['{ "a" : 1 , "b" : 2 }', { a: 1, b: 2 }], // object with whitespace
	['{"a":{"b":{"c":{"d":{}}}}}', { a: { b: { c: { d: {} } } } }], // deeply nested objects
	['{"a": null, "b": true, "c": false}', { a: null, b: true, c: false }], // mixed value types
	['{"arr":[1,2,3],"obj":{"x":10}}', { arr: [1, 2, 3], obj: { x: 10 } }], // nested array and object
	['{"a":1,"a":2}', { a: 2 }], // duplicate keys, last one wins (per JSON spec)

	// === Whitespace variations ===
	[' \n\t 1234 ', 1234], // number with leading/trailing whitespace
	[' \n\t "abc" \r\n ', 'abc'], // string with whitespace
	['\n\t{\n\t"a"\t:\n1\n}\n', { a: 1 }], // object with whitespace around tokens
	[' [ \n 1 , \n 2 , \n 3 \n ] ', [1, 2, 3]], // array with whitespace
	[' { "a" : [ 1 , 2 , 3 ] } ', { a: [1, 2, 3] }], // nested with whitespace

	// === Edge cases and special characters ===
	['"\\u0000"', '\u0000'], // null character
	['"\\b\\f\\n\\r\\t"', '\b\f\n\r\t'], // control characters escapes
	['"\\/"', '/'], // escaped slash
	['"\\\\"', '\\'], // escaped backslash
	['"\\u2028"', '\u2028'], // line separator
	['"\\u2029"', '\u2029'], // paragraph separator
	['"multi\\nline"', 'multi\nline'], // escaped newline in string
]

const invalidInputs: string[] = [
	'"multi\nline"', // literal newline in string (invalid JSON, should fail)

	'{unquoted_key:1}', // unquoted key
	"{'a':1}", // single quotes
	'1,2,3 trailing]', // garbage after array
	'{ "a": undefined }', // undefined literal
	'{ "a": NaN }', // NaN literal
	'{ "a": Infinity }', // Infinity literal
	'1,2,,3]', // double comma
	'1,2,3,]', // trailing comma
	'{"a":1,}', // trailing comma in object
	'{,}', // comma without key-value
	'[}', // mismatched brackets
	'{"a":}', // missing value
	'{"a":1 "b":2}', // missing comma between pairs
	'{"a":1, "b":2,}', // trailing comma
	'{"a":1,, "b":2}', // double comma
	'{"a":1, "b":2 "c":3}', // missing comma
	'{"a":1 "b":2}', // missing comma

	'[1,2,3,]', // trailing comma (non-standard, should fail in strict JSON parsers)
	'[1,,2]', // sparse array (non-standard, should fail in strict JSON parsers)
	'{"a":1,}', // trailing comma (non-standard, should fail in strict JSON parsers)
]
