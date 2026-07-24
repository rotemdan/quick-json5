import { JsonParserError } from '../utilities/JsonParserError.js'
import { getTextPositionInfo, hexCharCodeToNumber, positivePowersOf10 } from '../utilities/Utilities.js'

export function parseJSON(jsonString: string, reviver?: JsonReviverFunction) {
	if (typeof jsonString !== 'string') {
		throw new TypeError(`Given JSON string argument is not a string.`)
	}

	if (reviver !== undefined && typeof reviver !== 'function') {
		throw new TypeError(`Reviver can only be a function.`)
	}

	let readPosition = 0

	function parse(initialCharCode: number) {
		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse string
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 34) { // '"' for string start
			readPosition += 1

			// Try to quickly parse the string for the common case where there are no escape patterns
			{
				const match = jsonString.substring(readPosition).match(/^[^\\\x00-\x1F]*?"/)

				if (match !== null) {
					const matchString = match[0]

					const str = matchString.substring(0, matchString.length - 1)

					readPosition += matchString.length

					return str
				}
			}

			// Fallback to slower method if an escape pattern is found or string is unterminated.
			let decodedString = ''

			while (true) {
				const charCode = readCharCodeAndAdvance()

				if (charCode === 34) { // '"'
					break
				} else if (charCode === 92) { // '\\'
					const escapedCharCharcode = readCharCodeAndAdvance()

					if (escapedCharCharcode <= 92) {
						if (escapedCharCharcode === 34 || escapedCharCharcode === 92 || escapedCharCharcode === 47) { // '"', '\' and '/'
							decodedString += String.fromCharCode(escapedCharCharcode)
						} else {
							const positionInfo = getInfoForPosition(readPosition - 2)
							throw new JsonParserError(`Invalid escaped character '${String.fromCharCode(escapedCharCharcode)}' in escape sequence starting at ${positionInfo.positionString}.`, positionInfo)
						}
					} else if (escapedCharCharcode === 110) { // 'n'
						decodedString += '\n'
					} else if (escapedCharCharcode === 114) { // 'r'
						decodedString += '\r'
					} else if (escapedCharCharcode === 116) { // 't'
						decodedString += '\t'
					} else if (escapedCharCharcode === 117) { // 'u'
						if (readPosition + 4 > jsonString.length) {
							const positionInfo = getInfoForCurrentReadPosition()
							throw new JsonParserError(`Unterminated hexadecimal sequence. Expected 4 hexadecimal characters at ${positionInfo.positionString}.`, positionInfo)
						}

						const codePoint =
							hexCharCodeToNumber(jsonString.charCodeAt(readPosition + 0)) << 12 |
							hexCharCodeToNumber(jsonString.charCodeAt(readPosition + 1)) << 8 |
							hexCharCodeToNumber(jsonString.charCodeAt(readPosition + 2)) << 4 |
							hexCharCodeToNumber(jsonString.charCodeAt(readPosition + 3))

						decodedString += String.fromCharCode(codePoint)

						readPosition += 4
					} else if (escapedCharCharcode === 102) { // 'f'
						decodedString += '\f'
					} else if (escapedCharCharcode === 98) { // 'b'
						decodedString += '\b'
					} else {
						const positionInfo = getInfoForPosition(readPosition - 2)
						throw new JsonParserError(`Invalid escaped character '${String.fromCharCode(escapedCharCharcode)}' in escape sequence at ${positionInfo.positionString}.`, positionInfo)
					}
				} else if (charCode === undefined) {
					const positionInfo = getInfoForPosition(jsonString.length - 1)
					throw new JsonParserError(`Unterminated string literal.`, positionInfo)
				} else if (charCode < 32) {
					const positionInfo = getInfoForPosition(readPosition - 1)
					throw new JsonParserError(`Invalid unescaped control character (${charCode}) at ${positionInfo.positionString}.`, positionInfo)
				} else {
					decodedString += String.fromCharCode(charCode)
				}
			}

			return decodedString
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse number
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode < 91) { // '0'-'9' or '-' for number start
			let numberStringStartPosition = readPosition
			let charCode = initialCharCode

			let isNegative: boolean

			if (charCode === 45) { // '-'
				isNegative = true

				charCode = advanceAndReadCharCode()
			} else {
				isNegative = false
			}

			let concatenatedInteger = 0

			// Parse integer part
			{
				const digitsStartPosition = readPosition

				while (charCode >= 48 && charCode <= 57) { // '0'-'9'
					const digitValue = charCode - 48

					concatenatedInteger = (concatenatedInteger * 10) + digitValue

					charCode = advanceAndReadCharCode()
				}

				const integerPartDigitCount = readPosition - digitsStartPosition

				if (integerPartDigitCount === 0) {
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}.`, positionInfo)
				}

				if (integerPartDigitCount > 1 && jsonString[digitsStartPosition] === '0') {
					const positionInfo = getInfoForPosition(digitsStartPosition)
					throw new JsonParserError(`Invalid leading zero found in number literal at ${positionInfo.positionString}.`, positionInfo)
				}
			}

			let fractionalDigitCount = 0

			// Parse fractional part
			if (charCode === 46) { // '.'
				charCode = advanceAndReadCharCode()

				const digitsStartPosition = readPosition

				while (charCode >= 48 && charCode <= 57) { // '0'-'9'
					const digitValue = charCode - 48
					concatenatedInteger = (concatenatedInteger * 10) + digitValue

					charCode = advanceAndReadCharCode()
				}

				fractionalDigitCount = readPosition - digitsStartPosition

				if (fractionalDigitCount === 0) {
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}. Exepcted at least one decimal digit following '.'.`, positionInfo)
				}
			}

			let exponent = 0

			// Parse exponent part
			if (charCode === 101 || charCode === 69) { // 'e' or 'E'
				charCode = advanceAndReadCharCode()

				let isNegativeExponent = false

				if (charCode === 43) { // '+'
					charCode = advanceAndReadCharCode()
				} else if (charCode === 45) { // '-'
					isNegativeExponent = true

					charCode = advanceAndReadCharCode()
				}

				let exponentDigitsStartPosition = readPosition

				while (charCode >= 48 && charCode <= 57) { // '0'-'9'
					const digitValue = charCode - 48
					exponent = (exponent * 10) + digitValue

					charCode = advanceAndReadCharCode()
				}

				if (readPosition === exponentDigitsStartPosition) {
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}. Exepcted at least one exponent digit.`, positionInfo)
				}

				if (isNegativeExponent) {
					exponent = -exponent
				}
			}

			const adjustedExponent = exponent - fractionalDigitCount

			// Use fast method for cases where the number can be parsed efficiently,
			// or fall back to slower method if not possible.
			if (concatenatedInteger < 2 ** 53 && adjustedExponent >= -22 && adjustedExponent <= 22) {
				let parsedNumber = concatenatedInteger

				if (adjustedExponent > 0) {
					parsedNumber *= positivePowersOf10[adjustedExponent]
				} else if (adjustedExponent < 0) {
					parsedNumber /= positivePowersOf10[-adjustedExponent]
				}

				if (isNegative) {
					return -parsedNumber
				} else {
					return parsedNumber
				}
			} else {
				return Number(jsonString.substring(numberStringStartPosition, readPosition))
			}
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse 'true' literal
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 116) { // 't' for true
			if (
				jsonString.charCodeAt(readPosition + 1) !== 114 || // 'r'
				jsonString.charCodeAt(readPosition + 2) !== 117 || // 'u'
				jsonString.charCodeAt(readPosition + 3) !== 101) { // 'e'

				const positionInfo = getInfoForCurrentReadPosition()
				throw new JsonParserError(`Expected 'true' at ${positionInfo.positionString}.`, positionInfo)
			}

			readPosition += 4

			return true
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse 'false' literal
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 102) { // 'f' for false
			if (
				jsonString.charCodeAt(readPosition + 1) !== 97 || // 'a'
				jsonString.charCodeAt(readPosition + 2) !== 108 || // 'l'
				jsonString.charCodeAt(readPosition + 3) !== 115 || // 's'
				jsonString.charCodeAt(readPosition + 4) !== 101) { // 'e'

				const positionInfo = getInfoForCurrentReadPosition()
				throw new JsonParserError(`Expected 'false' at ${positionInfo.positionString}.`, positionInfo)
			}

			readPosition += 5

			return false
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse 'null' literal
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 110) { // 'n' for null
			if (
				jsonString.charCodeAt(readPosition + 1) !== 117 || // 'u'
				jsonString.charCodeAt(readPosition + 2) !== 108 || // 'l'
				jsonString.charCodeAt(readPosition + 3) !== 108) { // 'l'

				const positionInfo = getInfoForCurrentReadPosition()
				throw new JsonParserError(`Expected 'null' at ${positionInfo.positionString}.`, positionInfo)
			}

			readPosition += 4

			return null
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse array
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 91) { // '[' for array start
			readPosition += 1

			let charCode = skipToNextReadableCharCode()

			if (charCode === 93) { // ']' for array end
				readPosition += 1

				return []
			}

			const arr: any[] = []

			while (true) {
				const elementStartPosition = readPosition

				let element = parse(charCode)

				if (reviver !== undefined) {
					element = applyReviver('', element, elementStartPosition)
				}

				arr.push(element)

				charCode = skipToNextReadableCharCode()

				if (charCode === 44) { // ',' for comma
					readPosition += 1

					charCode = skipToNextReadableCharCode()

					continue
				}

				if (charCode === 93) { // ']' for array end
					readPosition += 1

					break
				}

				{
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' in array expression at ${positionInfo.positionString}. Expected ',' or ']'.`, positionInfo)
				}
			}

			return arr
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse object
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 123) { // '{' for object start
			readPosition += 1

			let charCode = skipToNextReadableCharCode()

			if (charCode === 125) { // '}' for object end
				readPosition += 1

				return {}
			}

			const obj: any = {}

			while (true) {
				if (charCode !== 34) {
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}. Expected '"'.`, positionInfo)
				}

				const key = parse(charCode)

				charCode = skipToNextReadableCharCode()

				if (charCode !== 58) { // ':'
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}. Expected ':'.`, positionInfo)
				}

				readPosition += 1

				charCode = skipToNextReadableCharCode()

				const valueStartPosition = readPosition

				let value = parse(charCode)

				if (reviver !== undefined) {
					value = applyReviver(key, value, valueStartPosition, obj)
				}

				obj[key] = value

				const commaOrClosingBraceCharCode = skipToNextReadableCharCode()

				if (commaOrClosingBraceCharCode === 44) { // ','
					readPosition += 1

					charCode = skipToNextReadableCharCode()

					continue
				}

				if (commaOrClosingBraceCharCode === 125) { // '}'
					readPosition += 1

					break
				}

				{
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(commaOrClosingBraceCharCode)}' in object expression at ${positionInfo.positionString}. Expected ',' or '}'.`, positionInfo)
				}
			}

			return obj
		}

		{
			const positionInfo = getInfoForCurrentReadPosition()
			throw new JsonParserError(`Invalid character '${String.fromCharCode(initialCharCode)}' at ${positionInfo.positionString}.`, positionInfo)
		}
	}

	function advanceAndReadCharCode() {
		return jsonString.charCodeAt(++readPosition)
	}

	function readCharCodeAndAdvance() {
		return jsonString.charCodeAt(readPosition++)
	}

	function skipWhitespace() {
		while (readPosition < jsonString.length) {
			const charCode = jsonString.charCodeAt(readPosition)

			if (charCode > 32 || (charCode !== 32 && charCode !== 10 && charCode !== 13 && charCode !== 9)) {
				return charCode
			}

			readPosition += 1
		}

		return undefined
	}

	function skipToNextReadableCharCode() {
		const nextCharCode = skipWhitespace()

		if (nextCharCode === undefined) {
			const positionInfo = getInfoForPosition(jsonString.length - 1)
			throw new JsonParserError(`Unexpected termination of JSON input.`, positionInfo)
		}

		return nextCharCode
	}

	function getInfoForCurrentReadPosition() {
		return getInfoForPosition(readPosition)
	}

	function getInfoForPosition(position: number) {
		return getTextPositionInfo(jsonString, position)
	}

	function applyReviver(key: string, value: any, valueStartPosition: number, thisArg?: any) {
		if (reviver === undefined) {
			return
		}

		let context: string | undefined

		if (typeof value !== 'object' || value === null) {
			context = jsonString.substring(valueStartPosition, readPosition)
		}

		let result: any

		if (thisArg) {
			result = reviver.call(thisArg, key, value, context)
		} else {
			result = reviver(key, value, context)
		}

		return result
	}

	// Parse the given string
	{
		const initialCharCode = skipToNextReadableCharCode()

		const documentStartPosition = readPosition

		let result = parse(initialCharCode)

		if (reviver !== undefined) {
			result = applyReviver('', result, documentStartPosition)
		}

		const finalSkipResult = skipWhitespace()

		if (finalSkipResult !== undefined) {
			const positionInfo = getInfoForCurrentReadPosition()
			throw new JsonParserError(`Unexpected trailing character(s) starting at ${positionInfo.positionString}.`, positionInfo)
		}

		return result
	}
}

export type JsonReviverFunction = (key: string, value: any, context?: string) => any
