import { Json5Options, JsonReplacerFunction, JsonReplacerType } from '../types/Types.js'
import { charCodeToHex } from '../utilities/Utilities.js'

export function stringify(obj: any, replacer?: JsonReplacerType, space = 0, options?: Json5Options) {
	const extensionsEnabled = options?.enableExtensions

	let replacerFunc: JsonReplacerFunction | undefined

	if (replacer != null) {
		if (typeof replacer === 'function') {
			replacerFunc = replacer
		} else if (Array.isArray(replacer)) {
			const replacerSet = new Set()

			for (const key of replacer) {
				replacerSet.add(String(key))
			}

			replacerFunc = (key, value) => {
				if (replacerSet.has(key)) {
					return value
				}
			}
		} else {
			throw new TypeError('Invalid replacer argument.')
		}
	}

	const baseIndentString = ' '.repeat(space)

	let currentIndentLevel = 0

	function getIndentString() {
		if (space === 0) {
			return ''
		}

		const spaces = baseIndentString.repeat(currentIndentLevel)

		return `\n${spaces}`
	}

	function encode(obj: any) {
		if (obj === undefined) {
			return ''
		}

		const typeofObj = typeof obj

		if (obj === null || typeofObj === 'number' || typeofObj === 'boolean') {
			return String(obj)
		}

		if (typeofObj === 'bigint') {
			if (extensionsEnabled === false) {
				throw new Error(`Encoding BigInt values requires JSON5 extensions to be enabled in options.`)
			}

			return String(obj)
		}

		if (typeofObj === 'string') {
			return `"${escapeStringIfNeeded(obj)}"`
		}

		if (typeof obj !== 'object') {
			throw new Error(`Type '${typeof obj}' can't be encoded in JSON5.`)
		}

		if (typeof obj.toJSON === 'function') {
			return obj.toJSON()
		}

		if (Array.isArray(obj)) {
			let str = '['
			let isFirstElement = true

			for (let i = 0; i < obj.length; i++) {
				const element = obj[i]

				if (element === undefined) {
					continue
				}

				currentIndentLevel += 1

				const saparatingComma = isFirstElement === true ? '' : ','
				const indentString = getIndentString()

				const encodedElement = encode(element)

				str += `${saparatingComma}${indentString}${encodedElement}`

				currentIndentLevel -= 1

				isFirstElement = false
			}

			str += `${getIndentString()}]`

			return str
		} else {
			let str = '{'
			let isFirstEntry = true

			for (const key in obj) {
				let value = obj[key]

				if (replacerFunc !== undefined) {
					value = replacerFunc(key, value)
				}

				if (value === undefined) {
					continue
				}

				currentIndentLevel += 1

				const saparatingComma = isFirstEntry === true ? '' : ','
				const indentString = getIndentString()

				const keyDoesNotRequireQuoting = /^[\p{ID_Start}\$_\u200C\u200D](?:[\p{ID_Continue}\$_\u200C\u200D])*$/u.test(key)
				const keyWithPossibleQuotes = keyDoesNotRequireQuoting ? key : `"${escapeStringIfNeeded(key)}"`

				const spaceAfterColons = space > 0 ? ' ' : ''

				const encodedValue = encode(value)

				str += `${saparatingComma}${indentString}${keyWithPossibleQuotes}:${spaceAfterColons}${encodedValue}`

				currentIndentLevel -= 1

				isFirstEntry = false
			}

			str += `${getIndentString()}}`

			return str
		}
	}

	return encode(obj)
}

function escapeStringIfNeeded(str: string): string {
	if (!/["\\\x00-\x1F]/.test(str)) {
		return str
	} else {
		return escapeString(str)
	}
}

function escapeString(str: string): string {
	let escapedStr = ''

	for (let i = 0; i < str.length; i++) {
		const charCode = str.charCodeAt(i)

		if (charCode >= 32) {
			if (charCode === 34) { // '"'
				escapedStr += '\\"'
			} else if (charCode === 92) { // '\\'
				escapedStr += '\\\\'
			} else {
				escapedStr += String.fromCharCode(charCode)
			}
		} else {
			if (charCode === 10) { // '\n'
				escapedStr += '\\n'
			} else if (charCode === 13) { // '\r'
				escapedStr += '\\r'
			} else if (charCode === 9) { // '\t'
				escapedStr += '\\t'
			} else if (charCode === 12) { // '\f'
				escapedStr += '\\f'
			} else if (charCode === 8) { // '\b'
				escapedStr += '\\b'
			} else if (charCode === 11) { // '\v'
				escapedStr += '\\v'
			} else if (charCode === 0) { // '\v'
				escapedStr += '\\0'
			} else {
				escapedStr += `\\u${charCodeToHex(charCode)}`
			}
		}
	}

	return escapedStr
}
