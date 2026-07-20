import { JsonReplacerFunction, JsonReplacerType } from '../types/Types.js'
import { charCodeToHex } from '../utilities/Utilities.js'

export function stringifyJSON(obj: any, replacer?: JsonReplacerType, space = 0) {
	let replacerFunc: JsonReplacerFunction | undefined

	if (replacer != null) {
		if (Array.isArray(replacer)) {
			const replacerSet = new Set()

			for (const key of replacer) {
				replacerSet.add(String(key))
			}

			replacerFunc = (key, value) => {
				if (replacerSet.has(key)) {
					return value
				}
			}
		} else if (typeof replacer === 'function') {
			replacerFunc = replacer
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

		if (obj === null || typeofObj === 'boolean') {
			return String(obj)
		}

		if (typeofObj === 'number') {
			if (isNaN(obj) || obj === Infinity || obj === -Infinity) {
				throw new Error(`NaN and Infinity can't be encoded in JSON`)
			}

			return String(obj)
		}

		if (typeofObj === 'string') {
			return `"${escapeStringIfNeeded(obj)}"`
		}

		if (typeof obj !== 'object') {
			throw new Error(`Type '${typeof obj}' cannot be encoded in JSON`)
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
				const escapedKey = escapeStringIfNeeded(key)
				const spaceAfterColons = space > 0 ? ' ' : ''

				const encodedValue = encode(value)

				str += `${saparatingComma}${indentString}"${escapedKey}":${spaceAfterColons}${encodedValue}`

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
			} else {
				escapedStr += `\\u${charCodeToHex(charCode)}`
			}
		}
	}

	return escapedStr
}
