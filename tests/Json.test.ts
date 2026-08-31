import { test, expect } from 'vitest'
import { JsonReplacerType, JsonReviverFunction, JsonSerializerOptions, parseJSON, stringifyJSON } from '../src/exports/Exports.ts'

test('Correctly serializes various inputs to standard JSON', () => {
	testOutputMatchToNativeMany(testInputs, {})
})

test('Correctly serializes various inputs to standard JSON (4 spaces indent)', () => {
	testOutputMatchToNativeMany(testInputs, { indentSpace: 4 })
})

test('Correctly serializes and deserializes various inputs to standard JSON', () => {
	testDeserializedMatchesOriginalMany(testInputs, {})
})

test('Correctly serializes and deserializes various inputs to standard JSON (4 spaces indent)', () => {
	testDeserializedMatchesOriginalMany(testInputs, { indentSpace: 4 })
})

function testOutputMatchesNative(value: any, options: SerializationMatchTestOptions) {
	const serialized = stringifyJSON(value, options.replacer, options.indentSpace)
	const serializedNative = JSON.stringify(value, options.replacer as any, options.indentSpace)

	expect(serialized).toEqual(serializedNative)
}

function testOutputMatchToNativeMany(values: any[], options: SerializationMatchTestOptions) {
	for (const value of values) {
		testOutputMatchesNative(value, options)
	}
}

function testDeserializedMatchesOriginal(value: any, options: SerializationMatchTestOptions) {
	const serialized = stringifyJSON(value, options.replacer, options.indentSpace, options.serializerOptions)
	const deserialized = parseJSON(serialized, options.reviver)

	expect(value).toEqual(deserialized)
}

function testDeserializedMatchesOriginalMany(values: any[], options: SerializationMatchTestOptions) {
	for (const value of values) {
		if (value === undefined) {
			continue
		}

		if (value === Infinity || value === -Infinity || isNaN(value)) {
			continue
		}

		testDeserializedMatchesOriginal(value, options)
	}
}

const testInputs: any[] = [
	// Undefined
	undefined,

	// Null
	null,

	// Integers
	456456,
	42398,
	309458304
	- 2349238,
	111111111111111,
	340565635643786,
	-7340565635643786,
	-1.146929984073879e+41,
	7.216130261527466e+55,
	12345678912345678e+44,
	18446744073709552000, // Number larger than MAX_SAFE_INTEGER (might lose precision)
	-18446744073709552000, // Negative number smaller than MIN_SAFE_INTEGER (might lose precision)

	// Floating point values
	1e-23,
	-0.000005342015761652585,
	-25113450257956,
	0.37020872374747804,
	0.90071992547409915,
	1.23423e-7,
	1.23423e+7,
	1.2e23,
	-0.2394823094823094823094655775,
	0.4568034958029834023985203958,
	0.3409583598304583045893490582094820,
	0.3459235938274590328475902348739857,
	0.9999999999999999999999999999999999999999,
	-345345340598340958340958340958341.2340598340958345e73,
	0.49999999999999999,
	0.50000000000000001,
	0.90071992547409915,
	0.33333333333333333333333333333333333333333,
	0.00000000000000000000001,
	-0.9999999999999999999999,
	23429841.2039402322e33,
	1111111111111111111111111111111111111111111111.111111111111111111111111111111111111111111111111111111111,

	// Special floating point values
	Infinity,
	-Infinity,
	NaN,
	-NaN,

	// Booleans
	true,
	false,

	// Strings
	'hello',
	'得国际标达😀😀到并获得国际标😀达到',
	`😀 asdf \n \n😀 \t [][] { \r\n " 得国际标达😀😀到并获得国际标😀达到 " 得国际标达到并获得国际标达到 " asdf """" `,
	` asdf \n \n \t \r\n " " " asdf """"  `,
	'\u0000', // Null character
	'\b\f\n\r\t', // Control characters escapes
	'/', // Escaped slash
	'\\', // Escaped backslash
	'\u2028', // Line separator
	'\u2029', // Paragraph separator
	'multi\nline', // Escaped newline in string

	// Objects
	{},
	{ a: 'Hi!' },
	{
		'😀': '😀 Hi 😀',
		'😀 Yo 😀': {
			'😀 Go': '获得国际\n标',
			'AAA': 12341234,
		},
	},
	{
		'😀':
		{
			'😀获得国际😀':
			{
				'😀':
				{
					'😀':
						[1234, 54321, '😀😀😀']
				}
			}
		}
	},

	// Arrays
	[],
	[[[[[[[[]]]]]]]],
	[1354.34534, 2, -14356, 3.1, 4.123123123, -5.123123123, 6.123123123, -7.123123123, 8.123123123, 1354.34534e23,],
	[[[[[[[[123123.352, { a: 'hello!' }, undefined, null]]]]]]]],
	[{}, {}, {}],
	[[], [{}, {}], []],
	[
		{
			a: 'asdf',
			b: 123.456,
			c: {
				d: {
					e: false, f: null
				}
			}, d: true, 获得: null, e: undefined, '😀': '😀\n😀'
		},
		false,
		'😀😀'
	],
]

interface SerializationMatchTestOptions {
	replacer?: JsonReplacerType
	indentSpace?: string | number
	serializerOptions?: JsonSerializerOptions

	reviver?: JsonReviverFunction
}
