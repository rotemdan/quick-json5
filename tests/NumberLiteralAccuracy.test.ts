import { test, expect } from 'vitest'
import { parseJSON5 } from '../src/exports/Exports.ts'

//////////////////////////////////////////////////////////////////////////////
// Verifies that every numeric literal variant parses to the exact same
// IEEE 754 double that the ECMAScript string-to-number conversion
// (`Number(literal)`) produces. The parsers use fast accumulation paths,
// which must agree with the reference conversion or fall back to it.
//////////////////////////////////////////////////////////////////////////////

function makeDigitGenerator(seedStart: number) {
	let seed = seedStart
	return function (alphabet: string) {
		seed = (seed * 1103515245 + 12345) >>> 0
		return alphabet[seed % alphabet.length]
	}
}

test('hexadecimal literals round exactly like Number()', () => {
	const rndDigit = makeDigitGenerator(0x2F6E2B1)
	const hexAlphabet = '0123456789abcdefABCDEF'

	let firstMismatch = ''

	for (let i = 0; i < 5000; i++) {
		// Long hex literals that exceed the 2^53 exact-integer range
		const digitCount = 14 + (i % 5)
		let hexStr = ''
		for (let j = 0; j < digitCount; j++) {
			hexStr += rndDigit(hexAlphabet)
		}
		if (Number.parseInt(hexStr, 16) === 0) continue // Skip all-zero literals

		const literal = `0x${hexStr}`
		const parsed = parseJSON5(literal)
		const reference = Number(literal)

		if (parsed !== reference) {
			if (firstMismatch === '') {
				firstMismatch = `${literal}: parsed ${parsed}, Number() gives ${reference}`
			}
		}
	}

	expect(firstMismatch).toBe('')
})

test('octal literals round exactly like Number()', () => {
	const rndDigit = makeDigitGenerator(0x1A2B3C4)
	const octalAlphabet = '01234567'

	let firstMismatch = ''

	for (let i = 0; i < 5000; i++) {
		const digitCount = 18 + (i % 4)
		let octStr = ''
		for (let j = 0; j < digitCount; j++) {
			octStr += rndDigit(octalAlphabet)
		}
		if (Number.parseInt(octStr, 8) === 0) continue

		const literal = `0o${octStr}`
		const parsed = parseJSON5(literal, undefined, { enableJson5Extensions: true })
		const reference = Number(literal)

		if (parsed !== reference) {
			if (firstMismatch === '') {
				firstMismatch = `${literal}: parsed ${parsed}, Number() gives ${reference}`
			}
		}
	}

	expect(firstMismatch).toBe('')
})

test('binary literals round exactly like Number()', () => {
	const rndDigit = makeDigitGenerator(0x4D5E6F7)
	const binaryAlphabet = '01'

	let firstMismatch = ''

	for (let i = 0; i < 5000; i++) {
		const digitCount = 55 + (i % 8)
		let binStr = ''
		for (let j = 0; j < digitCount; j++) {
			binStr += rndDigit(binaryAlphabet)
		}
		if (Number.parseInt(binStr, 2) === 0) continue

		const literal = `0b${binStr}`
		const parsed = parseJSON5(literal, undefined, { enableJson5Extensions: true })
		const reference = Number(literal)

		if (parsed !== reference) {
			if (firstMismatch === '') {
				firstMismatch = `${literal}: parsed ${parsed}, Number() gives ${reference}`
			}
		}
	}

	expect(firstMismatch).toBe('')
})

test('decimal literals round exactly like Number()', () => {
	let mismatches = 0
	let firstMismatch = ''

	for (let i = 0; i < 100000; i++) {
		// Deterministic pseudo-random digits
		let seed = i * 2654435761 >>> 0
		const rnd = () => {
			seed = (seed * 1103515245 + 12345) >>> 0
			return seed
		}

		let str = ''
		if (rnd() % 2 === 0) str += '-'
		const intLen = 1 + (rnd() % 16)
		for (let j = 0; j < intLen; j++) str += (rnd() % 10).toString()
		if (intLen > 1 && String(Number.parseInt(str, 10))[0] === '0') continue // Leading zeros are invalid

		const addFraction = rnd() % 2 === 0
		const addExponent = rnd() % 2 === 0

		if (addFraction) {
			str += '.'
			const fracLen = 1 + (rnd() % 25)
			for (let j = 0; j < fracLen; j++) str += (rnd() % 10).toString()
		} else if (addExponent) {
			str += (rnd() % 2 === 0) ? 'e' : 'E'
			if (rnd() % 2 === 0) str += (rnd() % 2 === 0) ? '+' : '-'
			str += (1 + (rnd() % 40)).toString()
		} else {
			continue // Need at least a fraction or exponent for interesting cases
		}

		const reference = Number(str)
		let ours: any
		try {
			ours = parseJSON5(str)
		} catch {
			continue // Invalid literal, skip
		}

		if (!Object.is(ours, reference)) {
			mismatches++
			if (firstMismatch === '') firstMismatch = `${str}: Number=${reference}, parser=${ours}`
		}
	}

	expect(firstMismatch).toBe('')
	expect(mismatches).toBe(0)
})
