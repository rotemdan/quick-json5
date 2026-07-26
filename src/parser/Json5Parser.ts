import { JsonParserError } from '../utilities/JsonParserError.js'
import { getTextPositionInfo, hexCharCodeToNumber, positivePowersOf10 } from '../utilities/Utilities.js'
import { type JsonReviverFunction } from './JsonParser.js'

export function parseJSON5(json5String: string, reviver?: JsonReviverFunction, options?: Json5ParserOptions) {
	if (typeof json5String !== 'string') {
		throw new TypeError(`Given JSON5 string argument is not a string.`)
	}

	if (reviver !== undefined && typeof reviver !== 'function') {
		throw new TypeError(`Reviver can only be a function.`)
	}

	const extensionsEnabled = options?.enableJson5Extensions === true

	let readPosition = 0

	function parse(initialCharCode: number) {
		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse string
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 34 || initialCharCode === 39) { // '"' or '\'' for string start
			readPosition += 1

			// Try to quickly parse the string for the case where there are no escape patterns
			{
				const remainingString = json5String.substring(readPosition)

				let match: RegExpMatchArray | null

				if (initialCharCode === 34) {
					match = remainingString.match(/^[^\\\r\n]*?"/)
				} else {
					match = remainingString.match(/^[^\\\r\n]*?'/)
				}

				if (match !== null) {
					const matchString = match[0]

					const str = matchString.substring(0, matchString.length - 1)

					readPosition += matchString.length

					return str
				}
			}

			// Fallback to slower method if an escape pattern is found, line breaks found, or string is unterminated.
			let decodedString = ''

			while (true) {
				const charCode = readCharCodeAndAdvance()

				if (charCode === initialCharCode) { // '"' or '\''
					break
				} else if (charCode === 92) { // '\\'
					const escapeSequenceCharcode = readCharCodeAndAdvance()

					if (escapeSequenceCharcode <= 92) {
						if (escapeSequenceCharcode === 10) {
							// Skip line continuation with \n character
						} else if (escapeSequenceCharcode === 13) {
							// Skip line continuation with \r character or \r\n sequence
							const nextCharCode = json5String.charCodeAt(readPosition)

							if (nextCharCode === 10) {
								readPosition += 1
							}
						} else if (escapeSequenceCharcode === 48) { // '0'
							decodedString += '\0'
							
							// Per JSON5 spec: a decimal digit must not follow \0
							const nextCharCode = json5String.charCodeAt(readPosition)

							if (nextCharCode >= 49 && nextCharCode <= 57) {
								const positionInfo = getInfoForCurrentReadPosition()
								throw new JsonParserError(`Found invalid escaped digit character after '\\0' at ${positionInfo.positionString}.`, positionInfo)
							}
						} else if (escapeSequenceCharcode >= 49 && escapeSequenceCharcode <= 57) {
							const positionInfo = getInfoForCurrentReadPosition()

							throw new JsonParserError(`Found invalid escaped digit character at ${positionInfo.positionString}.`, positionInfo)
						} else {
							decodedString += String.fromCharCode(escapeSequenceCharcode)
						}
					} else if (escapeSequenceCharcode === 110) { // 'n'
						decodedString += '\n'
					} else if (escapeSequenceCharcode === 114) { // 'r'
						decodedString += '\r'
					} else if (escapeSequenceCharcode === 116) { // 't'
						decodedString += '\t'
					} else if (escapeSequenceCharcode === 117) { // 'u' escape sequence
						if (readPosition + 4 > json5String.length) {
							const positionInfo = getInfoForPosition(json5String.length - 1)

							throw new JsonParserError(`Expected 4 hexadecimal characters at ${positionInfo.positionString}. Reached end of input.`, positionInfo)
						}

						try {
							const codePoint =
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 0)) << 12 |
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 1)) << 8 |
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 2)) << 4 |
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 3))

							decodedString += String.fromCharCode(codePoint)
						} catch {
							const positionInfo = getInfoForPosition(json5String.length - 1)

							throw new JsonParserError(`Invalid character in hexadecimal sequence at ${positionInfo.positionString}.`, positionInfo)
						}

						readPosition += 4
					} else if (escapeSequenceCharcode === 120) { // 'x' escape sequence
						if (readPosition + 2 > json5String.length) {
							const positionInfo = getInfoForCurrentReadPosition()
							throw new JsonParserError(`Expected 2 hexadecimal characters at ${positionInfo.positionString}. Reached end of input.`, positionInfo)
						}

						try {
							const codePoint =
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 0)) << 4 |
								hexCharCodeToNumber(json5String.charCodeAt(readPosition + 1))

							decodedString += String.fromCharCode(codePoint)
						} catch {
							const positionInfo = getInfoForCurrentReadPosition()
							throw new JsonParserError(`Invalid character in hexadecimal sequence at ${positionInfo.positionString}.`, positionInfo)
						}

						readPosition += 2
					} else if (escapeSequenceCharcode === 102) { // 'f'
						decodedString += '\f'
					} else if (escapeSequenceCharcode === 118) { // 'v'
						decodedString += '\v'
					} else if (escapeSequenceCharcode === 98) { // 'b'
						decodedString += '\b'
					} else if (escapeSequenceCharcode === 0x2028 || escapeSequenceCharcode === 0x2029) {
						// Skip line continuation with unicode line and paragraph separator characters
					} else if (escapeSequenceCharcode === undefined) {
						throw new JsonParserError(`Unterminated string literal.`, getInfoForPosition(json5String.length - 1))
					} else { // Anything else
						decodedString += String.fromCharCode(escapeSequenceCharcode)
					}
				} else if (Number.isNaN(charCode)) {
					throw new JsonParserError(`Unterminated string literal.`, getInfoForPosition(json5String.length - 1))
				} else {
					if (charCode === 10 || charCode === 13) {
						const positionInfo = getInfoForPosition(readPosition - 1)
						throw new JsonParserError(`Found invalid unescaped line break character in string literal at ${positionInfo.positionString}.`, positionInfo)
					}

					decodedString += String.fromCharCode(charCode)
				}
			}

			return decodedString
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse numeric pattern
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode < 91) { // '0'-'9', '-', '+', '.', 'I', 'N' for numeric pattern start
			let numberStringStartPosition = readPosition
			let charCode = initialCharCode

			////////////////////////////////////////////////////////////////////////////////////////////
			// Parse sign
			////////////////////////////////////////////////////////////////////////////////////////////
			let isNegative = false

			if (charCode === 45) { // '-'
				isNegative = true

				charCode = advanceAndReadCharCode()
			} else if (charCode === 43) { // '+'
				charCode = advanceAndReadCharCode()
			}

			////////////////////////////////////////////////////////////////////////////////////////////
			// Parse Infinity literal
			////////////////////////////////////////////////////////////////////////////////////////////
			if (charCode === 73) { // 'I' for Infinity
				if (
					json5String.charCodeAt(readPosition + 1) !== 110 || // 'n'
					json5String.charCodeAt(readPosition + 2) !== 102 || // 'f'
					json5String.charCodeAt(readPosition + 3) !== 105 || // 'i'
					json5String.charCodeAt(readPosition + 4) !== 110 || // 'n'
					json5String.charCodeAt(readPosition + 5) !== 105 || // 'i'
					json5String.charCodeAt(readPosition + 6) !== 116 || // 't'
					json5String.charCodeAt(readPosition + 7) !== 121) { // 'y'

					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Expected 'Infinity' at ${positionInfo.positionString}.`, positionInfo)
				}

				readPosition += 8

				if (isNegative) {
					return -Infinity
				} else {
					return Infinity
				}
			}

			////////////////////////////////////////////////////////////////////////////////////////////
			// Parse NaN literal
			////////////////////////////////////////////////////////////////////////////////////////////
			if (charCode === 78) { // 'N' for NaN
				if (
					json5String.charCodeAt(readPosition + 1) !== 97 || // 'a'
					json5String.charCodeAt(readPosition + 2) !== 78) { // 'N'

					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Expected 'NaN' at ${positionInfo.positionString}.`, positionInfo)
				}

				readPosition += 3

				if (isNegative) {
					return -NaN
				} else {
					return NaN
				}
			}

			////////////////////////////////////////////////////////////////////////////////////////////
			// Parse a potential string literal starting with '0'.
			// Like '0x' (hexadecimal), '0o' (octal) or '0b' (binary)
			////////////////////////////////////////////////////////////////////////////////////////////
			if (charCode === 48) { // '0'
				const nextCharCode = json5String.charCodeAt(readPosition + 1)

				if (nextCharCode === 120 || nextCharCode === 88) { // 'x' or 'X' for hexadecimal number
					readPosition += 1

					charCode = advanceAndReadCharCode()

					const hexDigitsStartPosition = readPosition
					let parsedHexValue = 0

					let lastUnderscorePosition = -1

					while (true) {
						let digitValue: number | undefined

						if (charCode >= 48 && charCode <= 57) { // '0'..'9'
							digitValue = charCode - 48
						} else if (charCode >= 65 && charCode <= 70) { // 'A'..'F'
							digitValue = charCode - 65 + 10
						} else if (charCode >= 97 && charCode <= 102) { // 'a'..'f'
							digitValue = charCode - 97 + 10
						} else if (charCode === 95) { // '_'
							lastUnderscorePosition = readPosition

							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}

						parsedHexValue = (parsedHexValue * 16) + digitValue

						charCode = advanceAndReadCharCode()
					}

					if (readPosition === hexDigitsStartPosition) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected at least one hexadecimal digit at ${positionInfo.positionString}.`, positionInfo)
					}

					if (lastUnderscorePosition >= 0) {
						if (extensionsEnabled === false) {
							const positionInfo = getInfoForPosition(hexDigitsStartPosition)
							throw new JsonParserError(`Hexadecimal literal at ${positionInfo.positionString} contains underscore separators, which are only supported when JSON5 extensions are enabled in options.`, positionInfo)
						}

						if (json5String[hexDigitsStartPosition] === '_' || lastUnderscorePosition === readPosition - 1) {
							const positionInfo = getInfoForPosition(hexDigitsStartPosition)
							throw new JsonParserError(`Hexadecimal literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
						}
					}

					if (isNegative) {
						return -parsedHexValue
					} else {
						return parsedHexValue
					}
				} else if (nextCharCode === 111) { // 'o' for octal
					readPosition += 1

					charCode = advanceAndReadCharCode()

					const octalDigitsStartPosition = readPosition

					if (extensionsEnabled === false) {
						const positionInfo = getInfoForPosition(octalDigitsStartPosition)
						throw new JsonParserError(`Octal literal at ${positionInfo.positionString} can only be parsed when JSON5 extensions are enabled in options.`, positionInfo)
					}

					let parsedOctalValue = 0

					while (true) {
						let digitValue: number | undefined

						if (charCode >= 48 && charCode <= 55) { // '0'..'7'
							digitValue = charCode - 48
						} else if (charCode === 95) { // '_'
							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}

						parsedOctalValue = (parsedOctalValue * 8) + digitValue

						charCode = advanceAndReadCharCode()
					}

					if (readPosition === octalDigitsStartPosition) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected at least one octal digit at ${positionInfo.positionString}.`, positionInfo)
					}

					if (json5String[octalDigitsStartPosition] === '_' || json5String[readPosition - 1] === '_') {
						const positionInfo = getInfoForPosition(octalDigitsStartPosition)
						throw new JsonParserError(`Octal literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
					}

					if (isNegative) {
						return -parsedOctalValue
					} else {
						return parsedOctalValue
					}
				} else if (nextCharCode === 98) { // 'b' for binary
					readPosition += 1

					charCode = advanceAndReadCharCode()

					const binaryDigitsStartPosition = readPosition

					if (extensionsEnabled === false) {
						const positionInfo = getInfoForPosition(binaryDigitsStartPosition)
						throw new JsonParserError(`Binary literal at ${positionInfo.positionString} can only be parsed when JSON5 extensions are enabled in options.`, positionInfo)
					}

					let parsedBinaryValue = 0

					while (true) {
						let digitValue: 0 | 1 | undefined

						if (charCode === 48) { // '0'..'9'
							digitValue = 0
						} else if (charCode === 49) {
							digitValue = 1
						} else if (charCode === 95) { // '_'
							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}

						parsedBinaryValue = (parsedBinaryValue * 2) + digitValue

						charCode = advanceAndReadCharCode()
					}

					if (readPosition === binaryDigitsStartPosition) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected at least one binary digit at ${positionInfo.positionString}.`, positionInfo)
					}

					if (json5String[binaryDigitsStartPosition] === '_' || json5String[readPosition - 1] === '_') {
						const positionInfo = getInfoForPosition(binaryDigitsStartPosition)
						throw new JsonParserError(`Binary literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
					}

					if (isNegative) {
						return -parsedBinaryValue
					} else {
						return parsedBinaryValue
					}
				}
			}

			////////////////////////////////////////////////////////////////////////////////////////////
			// Parse decimal number
			////////////////////////////////////////////////////////////////////////////////////////////
			{
				let concatenatedInteger = 0

				let integerPartDigitCount = 0
				let lastUnderscorePosition = -1

				// Parse integer part
				{
					const digitsStartPosition = readPosition

					while (true) { // '0'-'9'
						if (charCode >= 48 && charCode <= 57) {
							const digitValue = charCode - 48
							concatenatedInteger = (concatenatedInteger * 10) + digitValue

							charCode = advanceAndReadCharCode()
						} else if (charCode === 95) { // '_'
							lastUnderscorePosition = readPosition

							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}
					}

					// Ensure valid integer part
					integerPartDigitCount = readPosition - digitsStartPosition

					const firstDigit = json5String[digitsStartPosition]

					if (lastUnderscorePosition >= 0) {
						if (extensionsEnabled === false) {
							const positionInfo = getInfoForPosition(digitsStartPosition)
							throw new JsonParserError(`Numeric literal at ${positionInfo.positionString} contains underscore separators, which are only supported when JSON5 extensions are enabled in options.`, positionInfo)
						}

						if (firstDigit === '_' || lastUnderscorePosition === readPosition - 1) {
							const positionInfo = getInfoForPosition(digitsStartPosition)
							throw new JsonParserError(`Numeric literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
						}
					}

					if (integerPartDigitCount > 1 && firstDigit === '0') {
						const positionInfo = getInfoForPosition(digitsStartPosition)
						throw new JsonParserError(`Invalid leading zero found in numeric literal at ${positionInfo.positionString}.`, positionInfo)
					}
				}

				let fractionalPartDigitCount = 0

				// Parse fractional part
				if (charCode === 46) { // '.'
					charCode = advanceAndReadCharCode()

					const digitsStartPosition = readPosition

					while (true) { // '0'-'9'
						if (charCode >= 48 && charCode <= 57) {
							const digitValue = charCode - 48
							concatenatedInteger = (concatenatedInteger * 10) + digitValue

							charCode = advanceAndReadCharCode()
						} else if (charCode === 95) { // '_'
							lastUnderscorePosition = readPosition

							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}
					}

					// Notice that trailing 0s, like 0.1000000000000000000000000, would cause
					// the concatenated integer to grow, and later fall back to `Number()`.
					// Is it worthy to try to trim them somehow, or consider this rare?

					// Ensure valid fractional part
					fractionalPartDigitCount = readPosition - digitsStartPosition

					if (integerPartDigitCount === 0 && fractionalPartDigitCount === 0) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected at least one decimal digit at ${positionInfo.positionString}.`, positionInfo)
					}

					if (lastUnderscorePosition >= 0) {
						if (extensionsEnabled === false) {
							const positionInfo = getInfoForPosition(digitsStartPosition)
							throw new JsonParserError(`Decimal digits at ${positionInfo.positionString} contain underscore separators, which are only supported when JSON5 extensions are enabled in options.`, positionInfo)
						}

						if (json5String[digitsStartPosition] === '_' || lastUnderscorePosition === readPosition - 1) {
							const positionInfo = getInfoForPosition(digitsStartPosition)
							throw new JsonParserError(`Decimal digits in numeric literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
						}
					}
				} else if (charCode === 110) { // 'n' for BigInt
					if (extensionsEnabled === false) {
						const positionInfo = getInfoForPosition(numberStringStartPosition)
						throw new JsonParserError(`BigInt literal at ${positionInfo.positionString} can only be parsed when JSON5 extensions are enabled in options.`, positionInfo)
					}

					// Get substring for BigInt literal
					let bigIntSubstring = json5String.substring(numberStringStartPosition, readPosition)

					// Remove all underscore separators from substring
					if (lastUnderscorePosition >= 0) {
						bigIntSubstring = bigIntSubstring.replaceAll('_', '')
					}

					// Parse substring as BigInt
					const bigintValue = BigInt(bigIntSubstring)

					// Accept 'n' suffix character
					readPosition += 1

					return bigintValue
				} else if (integerPartDigitCount === 0) {
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${String.fromCharCode(charCode)}' at ${positionInfo.positionString}.`, positionInfo)
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

					while (true) {
						if (charCode >= 48 && charCode <= 57) { // '0'-'9'
							const digitValue = charCode - 48
							exponent = (exponent * 10) + digitValue

							charCode = advanceAndReadCharCode()
						} else if (charCode === 95) { // '_'
							lastUnderscorePosition = readPosition

							// Skip underscore
							charCode = advanceAndReadCharCode()

							continue
						} else {
							break
						}
					}

					// Ensure valid exponent part
					if (readPosition === exponentDigitsStartPosition) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected at least one exponent digit at ${positionInfo.positionString}.`, positionInfo)
					}

					if (lastUnderscorePosition >= 0) {
						if (extensionsEnabled === false) {
							const positionInfo = getInfoForPosition(exponentDigitsStartPosition)
							throw new JsonParserError(`Exponent digits at ${positionInfo.positionString} contain underscore separators, which are only supported when JSON5 extensions are enabled in options.`, positionInfo)
						}

						if (json5String[exponentDigitsStartPosition] === '_' || lastUnderscorePosition === readPosition - 1) {
							const positionInfo = getInfoForPosition(exponentDigitsStartPosition)
							throw new JsonParserError(`Exponent digits in numeric literal at ${positionInfo.positionString} contains an invalid preceding or trailing underscore.`, positionInfo)
						}
					}

					if (isNegativeExponent) {
						exponent = -exponent
					}
				}

				const adjustedExponent = exponent - fractionalPartDigitCount

				// Use fast method for cases where the number can be parsed efficiently,
				// or fall back to slower method if not possible.
				//
				// Reasoning:
				// * Integers in the range 0 to 2^53 - 1 can be represented exactly in FP64
				// * The powers of 10, up to 10^22 can be represented exactly in FP64, internally as
				//   `5^k * 2^k`, where 5^22 is still within FP64 mantissa (about 2^51.0824),
				//   but 5^23 is not (about 2^53.4043). `* 2^k` is a lossless bit shift and always exact
				// * Therefore, `n * 10^k` or `n / 10^k` where n and k is in these ranges, would compute
				//   an approximation, directly via FPU operations, that would be as good
				//   as the more complex algorithms used in `Number(str)`.
				// * This property was verified empirically by testing with a billion random inputs
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
					// Get substring for number literal
					let numberString = json5String.substring(numberStringStartPosition, readPosition)

					// Remove all underscore separators from substring, if seen
					if (lastUnderscorePosition >= 0) {
						numberString = numberString.replaceAll('_', '')
					}

					// Convert to number
					return Number(numberString)
				}
			}
		}

		////////////////////////////////////////////////////////////////////////////////////////////
		// Parse 'true' literal
		////////////////////////////////////////////////////////////////////////////////////////////
		if (initialCharCode === 116) { // 't' for true
			if (
				json5String.charCodeAt(readPosition + 1) !== 114 || // 'r'
				json5String.charCodeAt(readPosition + 2) !== 117 || // 'u'
				json5String.charCodeAt(readPosition + 3) !== 101) { // 'e'

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
				json5String.charCodeAt(readPosition + 1) !== 97 || // 'a'
				json5String.charCodeAt(readPosition + 2) !== 108 || // 'l'
				json5String.charCodeAt(readPosition + 3) !== 115 || // 's'
				json5String.charCodeAt(readPosition + 4) !== 101) { // 'e'

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
				json5String.charCodeAt(readPosition + 1) !== 117 || // 'u'
				json5String.charCodeAt(readPosition + 2) !== 108 || // 'l'
				json5String.charCodeAt(readPosition + 3) !== 108) { // 'l'

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
					element = applyReviver(String(arr.length), element, elementStartPosition, arr)
				}

				arr.push(element)

				charCode = skipToNextReadableCharCode()

				if (charCode === 44) { // ',' for comma
					readPosition += 1

					charCode = skipToNextReadableCharCode()

					// Handle possibility of trailing comma
					if (charCode === 93) { // ']' for array end
						readPosition += 1

						break
					}

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
				let key: string

				if (charCode === 34 || charCode === 39) { // '"' or '\'' for quoted key
					key = parse(charCode)
				} else { // Unquoted key
					const unquotedKeyRegExp =
						/^(?:[\p{ID_Start}\$_\u200C\u200D]|\\u[0-9a-fA-F]{4})(?:[\p{ID_Continue}\$_\u200C\u200D]|\\u[0-9a-fA-F]{4})*/u

					const remainingString = json5String.substring(readPosition)

					const unquotedKeyMatch = remainingString.match(unquotedKeyRegExp)

					if (unquotedKeyMatch === null) {
						const positionInfo = getInfoForCurrentReadPosition()
						throw new JsonParserError(`Expected '"', '\'', or valid unquoted key identifier at ${positionInfo.positionString}.`, positionInfo)
					}

					let escapedKey = unquotedKeyMatch[0]

					if (escapedKey.includes('\\')) {
						key = escapedKey.replaceAll(/\\u[0-9a-fA-F]{4}/g, (substr) => {
							const codePoint =
								hexCharCodeToNumber(substr.charCodeAt(2)) << 12 |
								hexCharCodeToNumber(substr.charCodeAt(3)) << 8 |
								hexCharCodeToNumber(substr.charCodeAt(4)) << 4 |
								hexCharCodeToNumber(substr.charCodeAt(5))

							return String.fromCharCode(codePoint)
						})
					} else {
						key = escapedKey
					}

					readPosition += escapedKey.length
				}

				charCode = skipToNextReadableCharCode()

				if (charCode !== 58) { // ':'
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${json5String[readPosition]}' at ${positionInfo.positionString}. Expected ':'.`, positionInfo)
				}

				readPosition += 1

				charCode = skipToNextReadableCharCode()

				const valueStartPosition = readPosition

				let value = parse(charCode)

				if (reviver !== undefined) {
					value = applyReviver(key, value, valueStartPosition, obj)
				}

				obj[key] = value

				charCode = skipToNextReadableCharCode()

				if (charCode === 44) { // ','
					readPosition += 1

					charCode = skipToNextReadableCharCode()

					// Handle possibility of trailing comma
					if (charCode === 125) { // '}' for object end
						readPosition += 1

						break
					}

					continue
				}

				if (charCode === 125) { // '}' for object end
					readPosition += 1

					break
				}

				{
					const positionInfo = getInfoForCurrentReadPosition()
					throw new JsonParserError(`Invalid character '${json5String[readPosition]}' in object expression at ${positionInfo.positionString}. Expected ',' or '}'.`, positionInfo)
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
		return json5String.charCodeAt(++readPosition)
	}

	function readCharCodeAndAdvance() {
		return json5String.charCodeAt(readPosition++)
	}

	function skipWhitespaceAndComments() {
		function skipCommentAndFollowingWhitespace() {
			const commentAndFollowingWhitespace = json5String.substring(readPosition).match(/^\/\/[^\r\n\u2028\u2029]*\s*|^\/\*[\s\S]*?\*\/\s*/)

			if (commentAndFollowingWhitespace === null) {
				const positionInfo = getInfoForCurrentReadPosition()
				throw new JsonParserError(`Failed to match a valid comment at ${positionInfo.positionString}.`, positionInfo)
			}

			readPosition += commentAndFollowingWhitespace[0].length
		}

		function isOtherWhitespace(charCode: number) {
			if (charCode >= 0x2000 && charCode <= 0x205F) {
				if (charCode <= 0x200A || charCode === 0x2028 || charCode === 0x2029 || charCode === 0x202F || charCode === 0x205F) {
					return true
				}
			} else if (charCode === 0x1680 || charCode === 0x3000 || charCode === 0xFEFF) {
				return true
			}

			return false
		}

		while (readPosition < json5String.length) {
			const charCode = json5String.charCodeAt(readPosition)

			if (charCode > 0x000D && charCode < 0x1680) {
				if (charCode === 0x0020 || charCode === 0x00A0) {
					readPosition += 1

					continue
				}

				if (charCode === 47) { // '/' for comment start
					skipCommentAndFollowingWhitespace()

					continue
				}
			} else if ((charCode >= 0x0009 && charCode <= 0x000D) || isOtherWhitespace(charCode)) {
				readPosition += 1

				continue
			}

			return charCode
		}

		return undefined
	}

	function skipToNextReadableCharCode() {
		const nextCharCode = skipWhitespaceAndComments()

		if (nextCharCode === undefined) {
			throw new JsonParserError(`Unexpected termination of JSON5 input.`, getInfoForPosition(json5String.length - 1))
		}

		return nextCharCode
	}

	function getInfoForCurrentReadPosition() {
		return getInfoForPosition(readPosition)
	}

	function getInfoForPosition(position: number) {
		return getTextPositionInfo(json5String, position)
	}

	function applyReviver(key: string, value: any, valueStartPosition: number, thisArg?: any) {
		if (reviver === undefined) {
			return
		}

		let context: string | undefined

		if (typeof value !== 'object' || value === null) {
			context = json5String.substring(valueStartPosition, readPosition)
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
			const rootWrapper = { '': result }

			result = applyReviver('', result, documentStartPosition, rootWrapper)
		}

		const finalSkipResult = skipWhitespaceAndComments()

		if (finalSkipResult !== undefined) {
			const positionInfo = getInfoForCurrentReadPosition()
			throw new JsonParserError(`Unexpected trailing character(s) starting at ${positionInfo.positionString}.`, positionInfo)
		}

		return result
	}
}

export interface Json5ParserOptions {
	enableJson5Extensions?: boolean
}
