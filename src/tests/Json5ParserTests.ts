import { parse } from '../json5/Json5Parser.js'
import { deepEquals } from '../utilities/ObjectUtilities.js'

const log = console.log

export function testJson5Parser() {
	for (const [source, expected] of testPairs) {
		let parsedObj: unknown

		try {
			parsedObj = parse(source, undefined, { enableExtensions: true })
		} catch (e: any) {
			log(`Error when parsing:`)
			log(source)
			log(``)
			log(e.message)

			return
		}

		if (!deepEquals(parsedObj, expected)) {
			log(`JSON5 not parsed correctly:`)
			log(source)

			return
		}
	}
}

export function testJson5ParserInvalidInputs() {
	for (const invalidInput of invalidInputs) {
		let parsedObj: any

		try {
			parsedObj = parse(invalidInput)
		} catch (e: any) {
			log(`Error when parsing:`)
			log(invalidInput)
			log(``)
			log(e.message)
			log(``)

			continue
		}

		throw new Error(`No error when parsing ${invalidInput}`)
	}
}

const testPairs: [string, unknown][] = [
	['{}', {}],
	['{"a":1}', { a: 1 }],
	["{'a':1}", { a: 1 }],
	['{a:1}', { a: 1 }],
	['{a\\u200C:3}', { 'a\u200C': 3 }],
	['{$_:1,_$:2,a\\u200C:3}', { $_: 1, _$: 2, 'a\u200C': 3 }],
	['{ùńîċõďë:9}', { 'ùńîċõďë': 9 }],
	['{\\u0061\\u0062:1,\\u0024\\u005F:2,\\u005F\\u0024:3}', { ab: 1, $_: 2, _$: 3 }],
	['{"__proto__":1}', { "__proto__": 1 }],
	['{abc:1,def:2}', { abc: 1, def: 2 }],
	['{a:{b:2}}', { a: { b: 2 } }],
	['[12341234123412341234n, "asdf"]', [12341234123412341234n, 'asdf']],

	['[]', []],
	['[1]', [1]],
	['[1,2]', [1, 2]],
	['[1,[2,3]]', [1, [2, 3]]],
	['[[]]', [[]]],
	['[[[],[[[[1, false, null, "hi"]]]]]]', [[[], [[[[1, false, null, "hi"]]]]]]],

	['null', null],

	['true', true],
	['false', false],

	['[0,0.,0e0]', [0, 0, 0]],
	['[1,23,456,7890]', [1, 23, 456, 7890]],
	['[-1,+2,-.1,-0]', [-1, 2, -0.1, -0]],
	['[.1,.23]', [0.1, 0.23]],
	['[1.0,1.23]', [1, 1.23]],
	['[1e0,1e1,1e01,1.e0,1.1e0,1e-1,1e+1]', [1, 10, 10, 1, 1.1, 0.1, 10]],
	['[0x1,0x10,0xff,0xFF]', [1, 16, 255, 255]],
	['[Infinity,-Infinity]', [Infinity, -Infinity]],
	['NaN', NaN],
	['-NaN', NaN],
	['1', 1],
	['+1.23e100', 1.23e+100],
	['+1.23e-100', 1.23e-100],
	['0x1', 0x1],
	['+0x01b23A4', +0x01b23A4],
	['-0x0123456789abcdefABCDEF', -0x0123456789abcdefABCDEF],

	['"abc"', 'abc'],
	["'abc'", 'abc'],
	[`['"', "'"]`, ['"', "'"]],
	[`['', ""]`, ['', '']],

	['{//hey\r\n}', {}],
	['{//hey\r\n x: 1234 //yo\n}', { x: 1234 }],
	['{ /*Comment!\n\r\n*/ }', {}],
	['{ /*Comment 1!\n\r\n*/ x: 1234 /* Comment 2! */ }', { x: 1234 }],

	['{\t\v\f \u00A0\uFEFF\n\r\u2028\u2029\u2003}', {}],

	[`'\\u01fF'`, `\u01fF`],
	[`'abc\\u01fFabc'`, `abc\u01fFabc`],
	[`'\\x12'`, `\x12`],
	[`'abc\\x12abc'`, `abc\x12abc`],
	[`'😅hey🙃'`, `😅hey🙃`],
	[`'\\u01fF\\\n\\\r\n\\\r\\\u2028\\\u2029\\a\\'\\"'`, `\u01FF\a'"`],
	[`'a\\\nb'`, 'ab'],
	[`'a\\\r\nb'`, 'ab'],
	[`"a\\\u2028b"`, 'ab'],
	[`'a\\\u2029b'`, 'ab'],
	[`'\\b\\f\\n\\r\\t\\v\\0\\x0f\\u01fF\\\n\\\r\n\\\r\\\u2028\\\u2029\\a\\'\\"'`, `\b\f\n\r\t\v\0\x0f\u01FF\a'"`],
	[`'hey \u2028 p \u2029 there'`, `hey \u2028 p \u2029 there`], // \u2028 and \u2029 can be used in string
	[`'hey \\\u2028\\\u2029 there'`, `hey  there`], // \u2028 and \u2029 can be used for line continuation
	['"unicode \\u263A"', 'unicode ☺'], // unicode escape sequence
	['"surrogate pair: \\uD834\\uDD1E"', 'surrogate pair: 𝄞'], // surrogate pair unicode

	[' { } ', {}], // Whitespace around object
	[' [ ] ', []], // Whitespace around array
	[' { "a" : 1 } ', { a: 1 }], // Whitespace around key-value colon
	[' { "a" : 1 , } ', { a: 1 }], // Whitespace around trailing comma
	[' [ 1 , 2 ] ', [1, 2]], // Whitespace around array commas
	[' "  abc  " ', '  abc  '], // Whitespace inside string
	[' \t\r\n{\t\r\n"a"\t\r\n:\t\r\n1\t\r\n}\t\r\n ', { a: 1 }], // Extensive whitespace everywhere
	['\u00A0{\u2003}\uFEFF', {}], // Unicode whitespace characters
	['\u000B{\u000C}', {}], // More whitespace characters (vertical tab, form feed)

	['// comment\n{}', {}], // Comment before object
	['{}// comment', {}], // Comment after object
	['[] // comment', []], // Comment after array
	['// comment\n[]', []], // Comment before array
	['{\n  // comment\n  "a": 1\n}', { a: 1 }], // Comment inside object - before key-value
	['{\n  "a": // comment\n  1\n}', { a: 1 }], // Comment inside object - between key and value
	[`{\n  'a': 1 // comment\n}`, { a: 1 }], // Comment inside object - after value
	['[\n  // comment\n  1,\n  2\n]', [1, 2]], // Comment inside array - before element
	['[\n  1, // comment\n  2\n]', [1, 2]], // Comment inside array - between elements
	['[\n  1,\n  2 // comment\n]', [1, 2]], // Comment inside array - after element
	['/* multi-line comment */ {}', {}], // Multi-line comment before object
	['{} /* multi-line comment */', {}], // Multi-line comment after object
	['/*\nmulti\nline\ncomment\n*/ {}', {}], // Multi-line comment with newlines
	['{\n  /* multi-line\n     comment */\n  "a": 1\n}', { a: 1 }], // Multi-line comment inside object
	['{\n  "a": 1, /*\n     multi-line\n     comment */\n}', { a: 1 }], // Multi-line comment at the end of object
	['// single-line comment\n{ "a": 1 } /* multi-line comment */ // another single-line', { a: 1 }], // Mixed comments
	['{\n  "a": 1, // single-line comment\n  "b": 2 /* multi-line comment */\n}', { a: 1, b: 2 }], // Comments interspersed in object
	['/* comment before */{/* comment inside object */}/* comment after */', {}], // Comments around and inside object
	['/* comment before */[/* comment inside array */]/* comment after */', []], // Comments around and inside array

	['{ "a": 1, }', { a: 1 }], // Trailing comma in object
	['[ 1, 2, ]', [1, 2]], // Trailing comma in array
	['{ "a": 1 ,}', { a: 1 }], // Trailing comma with whitespace
	['[ 1, 2 ,]', [1, 2]], // Trailing comma with whitespace in array
	['{ "a": 1 , // comment\n}', { a: 1 }], // Trailing comma with comment
	['[ 1, 2 , // comment\n]', [1, 2]], // Trailing comma with comment in array
	['{ ùńîċõďë: 1 ,  \t\r\n}', { ùńîċõďë: 1 }], // Trailing comma with various whitespace
	['[ 1, 2 ,  \t\r\n]', [1, 2]], // Trailing comma with various whitespace in array
	['[ 1, 2 \t\r\n  ,  \t\r\n]', [1, 2]], // Trailing comma with various whitespace before and after it
	['{ "a": 1, /* comment */ }', { a: 1 }], // Trailing comma position, but no comma - still valid
	['[ 1, 2, /* comment */ ]', [1, 2]], // Trailing comma position, but no comma in array - still valid
	[`{ '😅hey🙃': 123 /* comment */, }`, { '😅hey🙃': 123 }], // Emojis in key

	['[0.0, 0.00, 0.000]', [0, 0, 0]], // Zero with multiple decimal places
	['[12345678901234567890]', [12345678901234567890]], // Large integer
	['[-12345678901234567890]', [-12345678901234567890]], // Large negative integer
	['[1e+100, 1e-100, 1e100]', [1e+100, 1e-100, 1e+100]], // Large and small exponents
	['[1.23456789e+100, 1.23456789e-100]', [1.23456789e+100, 1.23456789e-100]], // Decimal with large/small exponents
	['[0x0, 0x9, 0xa, 0xf, 0xA, 0xF]', [0, 9, 10, 15, 10, 15]], // Hex digits (mixed case)
	['[0x1234567890abcdef]', [0x1234567890abcdef]], // Long hex number
	['[-0x1234567890abcdef]', [-0x1234567890abcdef]], // Negative long hex number
	['[+Infinity, -Infinity, NaN]', [Infinity, -Infinity, NaN]], // Explicit signs for Infinity and NaN
	['[+NaN]', [NaN]], // Plus NaN
	['[0., 1., 10., 100.]', [0, 1, 10, 100]], // Trailing decimal points
	['[.0, .1, .123]', [0, 0.1, 0.123]], // Leading decimal points
	['[123e0, 123e+0, 123e-0]', [123, 123, 123]], // Exponent with zero sign
	['[123E0, 123E+0, 123E-0]', [123, 123, 123]], // Uppercase E exponent
	['[123.456e7, 123.456E7]', [123.456e7, 123.456e7]], // Decimal and exponent
	['[123.e7, 123.E7]', [123.e7, 123.e7]], // Decimal point before exponent
	['[+0, -0]', [+0, -0]], // Positive and negative zero (important distinction in JS)
	['[0e+10]', [0]], // Zero with exponent
	['[18446744073709551616]', [18446744073709552000]], // Number larger than MAX_SAFE_INTEGER - might lose precision
	['[-18446744073709551616]', [-18446744073709552000]], // Negative number larger than MAX_SAFE_INTEGER
	['[5e-324]', [5e-324]], // Smallest positive number
	['[-5e-324]', [-5e-324]], // Smallest negative number

	[`{ identifierKey: 1 }`, { identifierKey: 1 }], // Identifier key
	[`{ $identifier: 1 }`, { $identifier: 1 }], // Identifier starting with $
	[`{ _identifier: 1 }`, { _identifier: 1 }], // Identifier starting with _
	[`{ identifier_123: 1 }`, { identifier_123: 1 }], // Identifier with numbers and underscore
	[`{ unicodeIdentifier\u200C: 1 }`, { 'unicodeIdentifier\u200C': 1 }], // Unicode identifier
	[`{ "stringKey": 1 }`, { stringKey: 1 }], // String key (already in original tests, but good to keep)
	[`{ "": 1 }`, { "": 1 }], // Empty string key
	[`{ "key with spaces": 1 }`, { 'key with spaces': 1 }], // String key with spaces
	[`{ 'key.with.dots': 1 }`, { 'key.with.dots': 1 }], // String key with dots
	[`{ "key-with-hyphens": 1 }`, { 'key-with-hyphens': 1 }], // String key with hyphens
	[`{ '123key': 1 }`, { '123key': 1 }], // String key starting with number
	[`{ "key with unicode \u200C": 1 }`, { 'key with unicode \u200C': 1 }], // String key with unicode
	[`{ key1: 1, "key1": 2 }`, { key1: 2 }], // Duplicate keys - last one wins (common behavior, but spec allows other interpretations)
	[`{ __proto__: 1 }`, { __proto__: 1 }], // "__proto__" key - important for security considerations in JS environments
	[`{ constructor: 1 }`, { constructor: 1 }], // "constructor" key - also relevant for JS security
	[`{ 'hasOwnProperty': 1 }`, { 'hasOwnProperty': 1 }], // "hasOwnProperty" key - another JS object property

	['{ // comment\n  "a" : /* comment */ 1 , // comment\n }', { a: 1 }], // Comments and whitespace around key-value and trailing comma
	['[ /* comment */ 1 , // comment\n 2 , /* comment */ ]', [1, 2]], // Comments and whitespace in array with trailing comma
	['{ a /* comment */ : /* comment */ 1 }', { a: 1 }], // Comments inside key-value pair
	['[ 1 /* comment */ , /* comment */ 2 ]', [1, 2]], // Comments inside array elements
	['{ "a" : /* comment */ [\n  1,\r\n  2,\n ] }', { a: [1, 2] }], // Comment inside nested structure
	['/* comment */ { /* comment */ "a" /* comment */ : /* comment */ 1 /* comment */ } /* comment */', { a: 1 }], // Comments everywhere
	['\t\r\n// comment\n/* multi-line */\u00A0{\u2003"a":1,\n} \uFEFF', { a: 1 }], // Extreme whitespace and comments
	['{ a: +1.23e10 // comment \n, }', { a: 1.23e+10 }], // Number with explicit plus and exponent, comment and trailing comma
	['[ 0xdecaf, 0Xdecaf, "string\\\ncontinuation" , ]', [0xdecaf, 0xdecaf, 'stringcontinuation']], // Mixed number type, string continuation, trailing comma in array

	// Extensions to JSON5:
	// Octal literals, binary literals, big integers, underscore separators
	['[0o1234, 0b01000101, 12341234123412341234n]', [0o1234, 0b01000101, 12341234123412341234n]], // Zero with multiple decimal places
	['[0x1234_abc_1234_abc, 0o1234_1234, 0b01_0001_01, 1234_1234123_4123412_34n]', [0x1234_abc_1234_abc, 0o1234_1234, 0b01_0001_01, 1234_1234123_4123412_34n]], // Zero with multiple decimal places
]

const invalidInputs: string[] = [
	// === Invalid JSON (should fail strict parsers) ===
	'[1,2,3 trailing]', // garbage after array
	'{ "a": undefined }', // undefined literal
	'1,2,,3]', // double comma
	'{,}', // comma without key-value
	'[}', // mismatched brackets
	'{"a":}', // missing value
	'{"a":1 "b":2}', // missing comma between pairs
	'{"a":1,, "b":2}', // double comma
	'{"a":1, "b":2 "c":3}', // missing comma
	'{"a":1 "b":2}', // missing comma

	'"multi\nline"', // literal newline in string (invalid JSON, should fail)
	'[1,,2]', // sparse array (non-standard, should fail in strict JSON parsers)

	'012341234n'
]
