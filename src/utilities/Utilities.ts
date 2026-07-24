// Assumes character code is in uint16 range: 0 <= charCode <= 65535
export function charCodeTo4HexDigitsLowercase(charCode: number): string {
	function digitToCharCode(digit: number): number {
		if (digit < 10) {
			return 48 + digit // 48 is '0'
		} else {
			return 97 + digit - 10 // 97 is 'a'
		}
	}

	// Digit 1 (Least significant)
	const charCode1 = digitToCharCode(charCode & 0xF)

	// Digit 2
	const charCode2 = digitToCharCode((charCode >>> 4) & 0xF)

	// Digit 3
	const charCode3 = digitToCharCode((charCode >>> 8) & 0xF)

	// Digit 4 (Most significant)
	const charCode4 = digitToCharCode((charCode >>> 12) & 0xF)

	return String.fromCharCode(charCode4, charCode3, charCode2, charCode1)
}

export function hexCharCodeToNumber(charCode: number) {
	if (charCode >= 48 && charCode <= 57) { // '0'..'9'
		return charCode - 48
	} if (charCode >= 65 && charCode <= 70) { // 'A'..'F'
		return charCode - 65 + 10
	} else if (charCode >= 97 && charCode <= 102) { // 'a'..'f'
		return charCode - 97 + 10
	} else {
		throw new Error(`Invalid hexadecimal character: ${String.fromCharCode(charCode)}`)
	}
}

export const positivePowersOf10 = new Float64Array([
	1e+00, 1e+01, 1e+02, 1e+03, 1e+04, 1e+05, 1e+06, 1e+07, 1e+08, 1e+09,
	1e+10, 1e+11, 1e+12, 1e+13, 1e+14, 1e+15, 1e+16, 1e+17, 1e+18, 1e+19,
	1e+20, 1e+21, 1e+22
])

// Converts a character offset in a string to a (line number, column) pair.
//
// Line and column numbers are 1-based.
// Handles standard Unix (`\n`) and Windows (`\r\n`) line endings efficiently
// by searching for the `\n` character.
export function offsetToLineAndColumnNumber(text: string, charOffset: number): LineAndColumnNumber {
	// Handle the edge case of offset 0 quickly
	if (charOffset === 0) {
		return { lineNumber: 1, columnNumber: 1 }
	}

	if (charOffset > text.length) {
		throw new Error(`Character offset is larger than string length.`)
	}

	// Initialize line number and the position of the last line break found
	let lineNumber = 1
	let lastLineBreakPosition = -1
	let searchPosition = 0 // Position to start the next search from

	// Efficiently find line breaks using indexOf.
	// We only need to search up to the target offset.
	while (searchPosition < charOffset) {
		const lineBreakPosition = text.indexOf('\n', searchPosition)

		// If no more line breaks are found, or the next one is at or after the offset,
		// the target offset is on the current line.
		if (lineBreakPosition === -1 || lineBreakPosition >= charOffset) {
			break
		}

		// Found a line break before the offset.
		// Increment line number and update the position of the last line break.
		lineNumber++
		lastLineBreakPosition = lineBreakPosition

		// Start the next search immediately after the found line break.
		searchPosition = lineBreakPosition + 1
	}

	// Calculate the column number: it's the offset relative to the start of the current line.
	// The start of the current line is the character immediately after the last line break,
	// or the beginning of the string if no line breaks were found before the offset.
	const columnNumber = charOffset - (lastLineBreakPosition + 1) + 1

	return { lineNumber, columnNumber }
}

export function getTextPositionInfo(text: string, charOffset: number): PositionInfo {
	charOffset = clamp(charOffset, 0, text.length - 1)

	const {  lineNumber, columnNumber } = offsetToLineAndColumnNumber(text, charOffset)

	return {
		charOffset,

		lineNumber,
		columnNumber,

		positionString: `position ${charOffset} (line ${lineNumber}, column ${columnNumber})`
	}
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export interface LineAndColumnNumber {
	lineNumber: number
	columnNumber: number
}

export interface PositionInfo {
	charOffset: number

	lineNumber: number
	columnNumber: number

	positionString: string
}
