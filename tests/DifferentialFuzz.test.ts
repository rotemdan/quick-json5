import { test, expect } from 'vitest'
import { parseJSON5 } from '../src/exports/Exports.ts'

//////////////////////////////////////////////////////////////////////////////
// Differential fuzzing: the JSON5 parser must agree with the native
// JSON.parse implementation on all valid JSON documents.
//////////////////////////////////////////////////////////////////////////////

interface JsonValueMap { [key: string]: any }

function rndJsonValue(seedRef: { seed: number }, depth: number): any {
	const rnd = () => {
		seedRef.seed = ((seedRef.seed * 1103515245) + 12345) >>> 0
		return seedRef.seed
	}
	const kind = rnd() % (depth > 3 ? 4 : 6)
	if (kind === 0) return rnd() % 2 === 0 ? true : false
	if (kind === 1) return null
	if (kind === 2) {
		// Random number
		const sign = rnd() % 2 === 0 ? '' : '-'
		const intPart = (1 + (rnd() % 100000)).toString()
		const frac = rnd() % 2 === 0 ? `.${(1 + (rnd() % 1000000)).toString()}` : ''
		const exp = rnd() % 2 === 0 ? `e${rnd() % 2 === 0 ? '+' : '-'}${(1 + (rnd() % 30))}` : ''
		return JSON.parse(`${sign}${intPart}${frac}${exp}`)
	}
	if (kind === 3) {
		const len = rnd() % 8
		let s = ''
		for (let i = 0; i < len; i++) {
			const k = rnd() % 4
			if (k === 0) s += String.fromCharCode(32 + (rnd() % 95))
			else if (k === 1) s += String.fromCharCode(0x80 + (rnd() % 0x200))
			else if (k === 2) s += String.fromCodePoint(0x10000 + (rnd() % 0xFFFF))
			else s += String.fromCharCode(rnd() % 128)
		}
		return s
	}
	if (kind === 4) {
		const len = rnd() % 5
		const arr: any[] = []
		for (let i = 0; i < len; i++) arr.push(rndJsonValue(seedRef, depth + 1))
		return arr
	}
	const len = rnd() % 5
	const obj: JsonValueMap = {}
	for (let i = 0; i < len; i++) {
		let key = ''
		const klen = 1 + (rnd() % 6)
		for (let j = 0; j < klen; j++) key += String.fromCharCode(97 + (rnd() % 26))
		obj[key + i.toString()] = rndJsonValue(seedRef, depth + 1)
	}
	return obj
}

test('parseJSON5 agrees with JSON.parse on random JSON documents', () => {
	for (let i = 0; i < 20000; i++) {
		const value = rndJsonValue({ seed: (i * 2246822519) >>> 0 || 12345 }, 0)
		const doc = JSON.stringify(value)

		const native = JSON.parse(doc)
		const ours = parseJSON5(doc)

		let ok: boolean
		try {
			expect(ours).toEqual(native)
			ok = true
		} catch {
			ok = false
		}

		if (!ok) {
			throw new Error(`Mismatch for doc: ${doc}\nnative: ${JSON.stringify(native)}\nours: ${JSON.stringify(ours)}`)
		}
	}
})
