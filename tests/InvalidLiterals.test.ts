import { test, expect } from 'vitest'
import { parseJSON, parseJSON5, JsonParserError } from '../src/exports/Exports.ts'

//////////////////////////////////////////////////////////////////////////////
// Escape sequence validation and diagnostics
//////////////////////////////////////////////////////////////////////////////

// JSON5 spec, strings section: "A decimal digit must not follow a reverse
// solidus followed by a zero." A decimal digit includes '0', so '\0' must
// not be followed by any digit, including '0' itself.
test('Rejects \\\\0 escape followed by a decimal digit', () => {
	expect(() => parseJSON5('"\\00"')).toThrow()
	expect(() => parseJSON5("'\\00'")).toThrow()
	expect(() => parseJSON5('"\\000"')).toThrow()

	// Sanity: digits 1-9 after \0 must also be rejected
	expect(() => parseJSON5('"\\01"')).toThrow()

	// Sanity: \0 itself is fine
	expect(parseJSON5('"\\0"')).toBe('\0')
})

// Invalid hexadecimal escape sequences must be reported as JsonParserError,
// with the position pointing at the offending character (and not somewhere
// unrelated like the end of the input).
test('JSON parser throws JsonParserError (not Error) for invalid \\u hex sequence', () => {
	expect(() => parseJSON('"\\u00g0"')).toThrow(JsonParserError)
	expect(() => parseJSON('"\\uZZZZ"')).toThrow(JsonParserError)
})

test('JSON5 parser error position for invalid \\u hex sequence points at the bad char', () => {
	// Offsets: 0:'"' 1:'\\' 2:'u' 3:'Z' 4:'Z' 5:'Z' 6:'Z' 7:'"'
	try {
		parseJSON5('"\\uZZZZ"')
		expect.unreachable('expected a JsonParserError to be thrown')
	} catch (e: any) {
		expect(e).toBeInstanceOf(JsonParserError)
		expect(e.positionInfo.charOffset).toBeGreaterThanOrEqual(3)
		expect(e.positionInfo.charOffset).toBeLessThanOrEqual(6)
	}
})

test('JSON5 parser error position for invalid \\x hex sequence points near the bad char', () => {
	// Offsets: 0:'"' 1:'\\' 2:'x' 3:'Z' 4:'Z' 5:'"'
	try {
		parseJSON5('"\\xZ!"')
		expect.unreachable('expected a JsonParserError to be thrown')
	} catch (e: any) {
		expect(e).toBeInstanceOf(JsonParserError)
		expect(e.positionInfo.charOffset).toBeGreaterThanOrEqual(3)
		expect(e.positionInfo.charOffset).toBeLessThanOrEqual(4)
	}
})
