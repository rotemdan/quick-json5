import { TypedArray } from './TypedArray.js'

export function deepEquals(obj1: unknown, obj2: unknown): boolean {
	if (obj1 === obj2) {
		return true // Values or references are exactly equal
	}

	// From this point, values are known to not be equal

	// Take types
	const obj1Type = typeof obj1
	const obj2Type = typeof obj2

	// `typeof obj` can be:
	// "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function"

	if (obj1Type !== obj2Type) { // If types mismatch
		return false // Includes case when one is null and the other undefined
	}

	// Handle NaN equality
	if (obj1Type === 'number' && isNaN(obj1 as number) && isNaN(obj2 as number)) {
		return true
	}

	if (obj1Type !== 'object') { // If both are not objects (we know they have the same type at this point)
		// Return false, since values are not equal, and types other then "object" need to have
		// full equality to return true.
		return false
	}

	// Get object type tags for both
	const obj1Tag = toString.call(obj1)
	const obj2Tag = toString.call(obj2)

	if (obj1Tag !== obj2Tag) {
		return false
	}

	switch (obj1Tag) {
		case '[object Array]': {
			const arr1 = obj1 as any[]
			const arr2 = obj2 as any[]

			if (arr1.length !== arr2.length) {
				return false
			}

			for (let i = 0; i < arr1.length; i++) {
				if (!deepEquals(arr1[i], arr2[i])) {
					return false
				}
			}

			return true
		}

		case '[object Map]': {
			const map1 = obj1 as Map<any, any>
			const map2 = obj2 as Map<any, any>

			if (map1.size !== map1.size) {
				return false
			}

			for (const [key, value] of map1) {
				if (!map2.has(key)) {
					return false
				}

				if (!deepEquals(value, map2.get(key))) {
					return false
				}
			}

			return true
		}

		case '[object Set]': {
			const set1 = obj1 as Set<any>
			const set2 = obj2 as Set<any>

			if (set1.size !== set2.size) {
				return false
			}

			for (const element of set1) {
				if (!set2.has(element)) {
					return false
				}
			}

			return true
		}

		case '[object Int8Array]':
		case '[object Uint8Array]':
		case '[object Uint8ClampedArray]':
		case '[object Int16Array]':
		case '[object Uint16Array]':
		case '[object Int32Array]':
		case '[object Uint32Array]':
		case '[object BigInt64Array]':
		case '[object BigUint64Array]':
		case '[object Float32Array]':
		case '[object Float64Array]': {
			const arr1 = obj1 as TypedArray
			const arr2 = obj2 as TypedArray

			if (arr1.length !== arr2.length) {
				return false
			}

			for (let i = 0; i < arr1.length; i++) {
				if (arr1[i] !== arr2[i]) {
					return false
				}
			}

			return true
		}

		case '[object ArrayBuffer]': {
			const arr1 = obj1 as ArrayBuffer
			const arr2 = obj2 as ArrayBuffer

			return deepEquals(new Uint8Array(arr1), new Uint8Array(arr2))
		}

		case '[object DataView]': {
			const dataView1 = obj1 as DataView
			const dataView2 = obj2 as DataView

			if (dataView1.byteOffset !== dataView2.byteOffset) {
				return false
			}

			if (dataView1.byteLength !== dataView2.byteLength) {
				return false
			}

			return deepEquals(dataView1.buffer, dataView2.buffer)
		}

		case '[object Date]': {
			const date1 = obj1 as Date
			const date2 = obj2 as Date

			return date1.getTime() === date2.getTime()
		}

		case '[object RegExp]': {
			const regExp1 = obj1 as RegExp
			const regExp2 = obj2 as RegExp

			return regExp1.source === regExp2.source && regExp1.flags === regExp2.flags
		}

		default: {
			// Compare own properties using Reflect.ownKeys to include Symbols and non-enumerable
			const obj1Keys = Reflect.ownKeys(obj1 as any)
			const obj2Keys = Reflect.ownKeys(obj2 as any)

			if (obj1Keys.length !== obj2Keys.length) {
				return false
			}

			for (const key of obj1Keys) {
				if (!Reflect.has(obj2 as any, key)) { // Reflect.has checks own and inherited, sufficient here
					return false
				}

				const val1 = Reflect.get(obj1 as any, key)
				const val2 = Reflect.get(obj2 as any, key)

				if (!deepEquals(val1, val2)) {
					return false
				}
			}

			return true
		}
	}
}
