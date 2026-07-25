import { charCodeTo4HexDigitsLowercase, clamp } from '../utilities/Utilities.js'

// Serializes a JavaScript value into a JSON5 string.
export function stringifyJSON5(rootObj: any, replacer?: JsonReplacerType, indentSpace: string | number = 0, options?: Json5SerializerOptions): string {
	return stringifyJSON(rootObj, replacer, indentSpace, { enableJson5: true, ...options })
}

// Serializes a JavaScript value into a JSON(5) string.
//
// Mirrors the ECMAScript `JSON.stringify()` specification, including:
//
// * Replacer (function or whitelist array)
// * Pretty-printing via `space` (string or number)
// * `toJSON()` protocol
// * Circular reference detection
// * Boxed primitive unwrapping
// * Proper handling of `undefined`, functions, and symbols (context-dependent)
export function stringifyJSON(rootObj: any, replacer?: JsonReplacerType, indentSpace: string | number = 0, options?: JsonSerializerOptions): string {
	const json5Enabled = options?.enableJson5 === true
	const json5ExtensionsEnabled = json5Enabled && options?.enableJson5Extensions === true

	const jsonFormatString = json5Enabled ? 'JSON5' : 'JSON'

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Replacer setup
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	let replacerFunc: JsonReplacerFunction | undefined

	let whitelistKeys: string[] | undefined // Maintains explicit whitelist property iteration order per spec

	if (replacer != null) {
		if (Array.isArray(replacer)) {
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			// Array (whitelist) replacer
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			whitelistKeys = []

			const seenWhitelistKeys = new Set<string>()

			for (const replacerKey of replacer) {
				const item: any = replacerKey

				let key: string | undefined

				if (typeof item === 'string' || typeof item === 'number') {
					key = String(item)
				} else if (
					typeof item === 'object' &&
					item !== null &&
					(Object.prototype.toString.call(item) === '[object String]' || Object.prototype.toString.call(item) === '[object Number]')
				) {
					key = String(item.valueOf())
				}

				if (key !== undefined && !seenWhitelistKeys.has(key)) {
					seenWhitelistKeys.add(key)

					whitelistKeys.push(key)
				}
			}
		} else if (typeof replacer === 'function') {
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			// Function replacer
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			replacerFunc = replacer
		}

		// Note: Non-function, non-array replacer arguments are silently ignored per specification.
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Indentation setup
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	let baseIndentString = ''

	if (indentSpace !== 0) {
		// Unwrap boxed String or Number objects (e.g., new String("  "), new Number(4))
		let rawIndent: any = indentSpace

		if (rawIndent !== null && typeof rawIndent === 'object') {
			const indentTag = Object.prototype.toString.call(rawIndent)

			if (indentTag === '[object String]' || indentTag === '[object Number]') {
				rawIndent = rawIndent.valueOf()
			}
		}

		// Extract base indent string
		if (typeof rawIndent === 'number') {
			if (rawIndent > 0 && Number.isFinite(rawIndent)) {
				const spaceCount = clamp(Math.floor(rawIndent), 0, 10)

				baseIndentString = ' '.repeat(spaceCount)
			}
		} else if (typeof rawIndent === 'string') {
			baseIndentString = rawIndent.substring(0, 10)
		}
	}

	let currentIndentLevel = 0

	// Builds the indent string for the current nesting level.
	// Returns either an empty string (for no-indent mode or root level) or
	// a newline followed by the appropriate number of base indent units.
	function getIndentString() {
		if (baseIndentString.length === 0) {
			return ''
		} else {
			return `\n${baseIndentString.repeat(currentIndentLevel)}`
		}
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Transform function
	//
	// Handles toJSON lookup and replacer transformations
	//
	// Passing `undefined` container treats `value` as the root and wraps in a temporary object
	// in order to pass it to the replacer
	////////////////////////////////////////////////////////////////////////////////////////////////////////
	function applyTransformsIfNeeded(container: any, key: string | number, value: any): any {
		// The encoding pipeline per element (from the spec) is:
		//   raw value → toJSON(key) → replacer(key, value) → serialize()

		// Save reference to original value before toJSON mutates it
		const originalValue = value

		// Call toJSON ONLY if value is Object or BigInt (per spec)
		if (value != null &&
			(typeof value === 'object' || typeof value === 'bigint') &&
			typeof value.toJSON === 'function') {
			const stringKey = String(key)

			value = value.toJSON(stringKey)
		}

		// Apply replacer function if present
		if (replacerFunc !== undefined) {
			const stringKey = String(key)

			// Lazily allocate the spec-compliant holder ONLY when replacerFunc is active at the root level
			if (container == null) {
				container = { [stringKey]: originalValue }
			}

			value = replacerFunc.call(container, stringKey, value)
		}

		return value
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Serializer function
	//
	// Core recursive serializer. Serializes an arbitrary value into a JSON string fragment.
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	// Tracks objects currently being serialized so we can detect circular references.
	const seenObjects = new Set<object>()

	// The serialize inner function
	function serialize(obj: any): string {
		////////////////////////////////////////////////////////////////////////////////////////////////////////
		// Primitives
		////////////////////////////////////////////////////////////////////////////////////////////////////////

		// null and booleans
		if (obj === null || typeof obj === 'boolean') {
			return String(obj)
		}

		// Numbers
		if (typeof obj === 'number') {
			if (!json5Enabled && (isNaN(obj) || obj === Infinity || obj === -Infinity)) {
				// Numbers: NaN and Infinity are not valid JSON values.
				// Per spec they become `null`.
				return 'null'
			}

			return String(obj)
		}

		// Strings
		if (typeof obj === 'string') {
			// Strings must be quoted and have control characters / lone surrogates escaped.
			return `"${escapeString(obj)}"`
		}

		// BigInts
		if (typeof obj === 'bigint') {
			if (json5ExtensionsEnabled) {
				// Extended JSON5 supports BigInt literals
				return `${String(obj)}n`
			} else {
				throw new TypeError(`BigInts cannot be serialized to ${jsonFormatString}`)
			}
		}

		// Anything that isn't an object at this point (e.g. function, symbol)
		// cannot be meaningfully serialized. The spec says throw a TypeError.
		if (typeof obj !== 'object') {
			throw new TypeError(`Type '${typeof obj}' cannot be serialized to ${jsonFormatString}`)
		}

		////////////////////////////////////////////////////////////////////////////////////////////////////////
		// Boxed primitive handling
		////////////////////////////////////////////////////////////////////////////////////////////////////////
		const objectTag = Object.prototype.toString.call(obj)

		if (objectTag === '[object Number]' ||
			objectTag === '[object String]' ||
			objectTag === '[object Boolean]') {
			// new Number(5), new String("hi"), new Boolean(true) are objects but should
			// serialize as their primitive value. Object.prototype.toString identifies them.
			return serialize(obj.valueOf())
		}

		if (objectTag === '[object BigInt]') {
			if (json5ExtensionsEnabled) {
				return serialize(obj.valueOf())
			} else {
				throw new TypeError(`A boxed BigInt cannot be serialized to ${jsonFormatString}`)
			}
		}

		////////////////////////////////////////////////////////////////////////////////////////////////////////
		// Object and Array handling
		////////////////////////////////////////////////////////////////////////////////////////////////////////

		// Circular reference guard: if we encounter the same object reference twice
		// in the same serialization tree, throw a TypeError like native JSON.stringify.
		if (seenObjects.has(obj)) {
			throw new TypeError(`A circular structure cannot be serialized to ${jsonFormatString}`)
		}

		// Mark this object as currently-being-serialized for cycle detection.
		// It is removed when encoding of this sub-tree completes.
		seenObjects.add(obj)

		let outputString: string

		if (Array.isArray(obj)) {
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			// Array serialization
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			outputString = '['

			let isFirstElement = true

			for (let elementIndex = 0; elementIndex < obj.length; elementIndex++) {
				let element = obj[elementIndex]

				// Apply transforms if needed
				element = applyTransformsIfNeeded(obj, elementIndex, element)

				// Increase indent level
				currentIndentLevel += 1

				// Serialize the element.
				// undefined / functions / symbols in arrays become `null` (they can't be omitted
				// because arrays are positional — skipping would shift indices).
				let serializedElement: string

				if (element === undefined || typeof element === 'function' || typeof element === 'symbol') {
					serializedElement = 'null'
				} else {
					serializedElement = serialize(element)
				}

				// Initialize strings
				const possibleSeparatingComma = isFirstElement ? '' : ','
				const indentString = getIndentString()

				// Append element to output string
				outputString += `${possibleSeparatingComma}${indentString}${serializedElement}`

				// Decrease indent level
				currentIndentLevel -= 1

				isFirstElement = false
			}

			// Close the array.

			// If it had elements, add a trailing newline+indent before ']'.
			if (!isFirstElement) {
				outputString += getIndentString()
			}

			outputString += ']'
		} else {
			////////////////////////////////////////////////////////////////////////////////////////////////////////
			// Plain object serialization
			////////////////////////////////////////////////////////////////////////////////////////////////////////

			outputString = '{'

			let isFirstEntry = true

			// Whitelist replacer determines property iteration order per spec, otherwise own keys
			const keysToIterate = whitelistKeys ?? Object.keys(obj)

			for (const key of keysToIterate) {
				let value = obj[key]

				// Apply transforms if needed
				value = applyTransformsIfNeeded(obj, key, value)

				// Skip properties whose value is undefined, function, or symbol.
				// Unlike arrays, objects can omit such keys entirely.
				if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
					continue
				}

				// Increase indent level
				currentIndentLevel += 1

				// Initialize strings
				const possibleSeparatingComma = isFirstEntry === true ? '' : ','
				const indentString = getIndentString()

				let possiblyQuotedKey: string

				const json5UnquotedKeyRegExp =
					/^[\p{ID_Start}\$_\u200C\u200D](?:[\p{ID_Continue}\$_\u200C\u200D])*$/u

				if (json5Enabled && json5UnquotedKeyRegExp.test(key)) {
					possiblyQuotedKey = key
				} else {
					possiblyQuotedKey = `"${escapeString(key)}"`
				}

				// Add a space after the colon only when indentation is active
				const possibleSpaceAfterColons = baseIndentString.length > 0 ? ' ' : ''

				// Serialize the value
				const serializedValue = serialize(value)

				// Append property to output string
				outputString +=
					`${possibleSeparatingComma}${indentString}${possiblyQuotedKey}:${possibleSpaceAfterColons}${serializedValue}`

				// Decrease indent level
				currentIndentLevel -= 1

				isFirstEntry = false
			}

			// Close the object. If it had entries, add a trailing newline+indent before '}'.
			if (!isFirstEntry) {
				outputString += getIndentString()
			}

			outputString += '}'
		}

		// Done encoding this sub-tree; remove from the set so sibling branches
		// that reference the same object are allowed (e.g. DAGs, not just trees).
		seenObjects.delete(obj)

		return outputString
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Root-level processing
	////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Apply transforms
	rootObj = applyTransformsIfNeeded(undefined, '', rootObj)

	// If the root value is undefined/function/symbol at this point,
	// there is nothing to serialize — return the JS value `undefined`.
	// (This matches JSON.stringify(() => {}) → undefined.)
	if (rootObj === undefined || typeof rootObj === 'function' || typeof rootObj === 'symbol') {
		return undefined as any
	}

	// Serialize the preprocessed root value.
	return serialize(rootObj)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Escapes a string for inclusion in a JSON/JSON5 string literal.
////////////////////////////////////////////////////////////////////////////////////////////////////////

// Static lookup table for char codes 0 through 34
//
// Char codes 32 (space) and 33 (exclamation mark) are never looked up
// so don't get any value in the table.
const escapeCodeLookup: string[] = [
	'\\u0000', '\\u0001', '\\u0002', '\\u0003', '\\u0004', '\\u0005', '\\u0006', '\\u0007',
	'\\b', '\\t', '\\n', '\\u000b', '\\f', '\\r', '\\u000e', '\\u000f',
	'\\u0010', '\\u0011', '\\u0012', '\\u0013', '\\u0014', '\\u0015', '\\u0016', '\\u0017',
	'\\u0018', '\\u0019', '\\u001a', '\\u001b', '\\u001c', '\\u001d', '\\u001e', '\\u001f',
	'', '', '\\"'
]

function escapeString(str: string): string {
	// Resolves the proper escape sequence for a single matched character code.
	function getEscapeCode(charCode: number): string {
		if (charCode <= 34) {
			return escapeCodeLookup[charCode]
		} else if (charCode === 92) { // '\\'
			return '\\\\'
		} else {
			// Handle unpaired surrogates (rare)
			return `\\u${charCodeTo4HexDigitsLowercase(charCode)}`
		}
	}

	// Matches only characters that require escaping (including unpaired surrogates)
	const escapedCharPatternsRegExp =
		/["\\\x00-\x1F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

	// Apply replace pattern
	return str.replace(
		escapedCharPatternsRegExp,
		(match) => getEscapeCode(match.charCodeAt(0))
	)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Type definitions.
////////////////////////////////////////////////////////////////////////////////////////////////////////
export interface JsonSerializerOptions {
	enableJson5?: boolean
	enableJson5Extensions?: boolean
}

export interface Json5SerializerOptions {
	enableJson5Extensions?: boolean
}

export type JsonReplacerFunction = (key: string, value: any) => any
export type JsonReplacerArray = (string | number)[]
export type JsonReplacerType = JsonReplacerFunction | JsonReplacerArray | null
