import { JsonReplacerFunction, JsonReplacerType } from '../types/Types.js'
import { charCodeTo4HexDigits, clamp } from '../utilities/Utilities.js'


// Serializes an arbitrary JavaScript value into a JSON string.
//
// Mirrors the ECMAScript `JSON.stringify()` specification, including:
//
// * Replacer (function or whitelist array)
// * Pretty-printing via `space` (string or number)
// * `toJSON()` protocol
// * Circular reference detection
// * Boxed primitive unwrapping
// * Proper handling of `undefined`, functions, and symbols (context-dependent)
export function stringifyJSON(obj: any, replacer?: JsonReplacerType, indentSpace: string | number = 0) {
	// --- Replacer setup ---
	let replacerFunc: JsonReplacerFunction | undefined
	let hasWhitelistReplacer = false // Tracks whether the replacer is a whitelist array

	if (replacer != null) {
		if (Array.isArray(replacer)) {
			// --- Array (whitelist) replacer ---
			// Per spec, only string or number entries are valid; other types are silently ignored.
			hasWhitelistReplacer = true

			const replacerWhitelist = new Set()

			for (const replacerKey of replacer) {
				if (typeof replacerKey !== 'string' && typeof replacerKey !== 'number') {
					continue
				}

				replacerWhitelist.add(String(replacerKey))
			}

			replacerFunc = (key, value) => {
				// Whitelist-based replacer:
				//
				// * Root call (key '') always passes through so the top-level value is never filtered.
				// * Only object properties are filtered by the whitelist.
				// * Array elements are handled separately (the array loop skips calling the
				//   whitelist replacer entirely; see the hasWhitelistReplacer check in serialize()).
				if (key === '' || replacerWhitelist.has(key)) {
					return value
				}
			}
		} else if (typeof replacer === 'function') {
			// --- Function replacer ---
			// Used directly. It will be called with `this` set to the containing object/array.
			replacerFunc = replacer
		} else {
			throw new TypeError('Invalid replacer argument.')
		}
	}

	// --- Indentation setup ---
	// Per spec, numeric space is clamped to [0, 10].
	// string space is truncated to 10 chars.
	const baseIndentString = typeof indentSpace === 'string' ? indentSpace.substring(0, 10) : ' '.repeat(clamp(indentSpace, 0, 10))

	let currentIndentLevel = 0

	// Builds the indent string for the current nesting level.
	// Returns either an empty string (for no-indent mode or root level) or
	// a newline followed by the appropriate number of base indent units.
	function getIndentString() {
		if (indentSpace === 0 || indentSpace === '') {
			return ''
		}

		const spaces = baseIndentString.repeat(currentIndentLevel)

		return `\n${spaces}`
	}

	// --- Serializer function ---
	// Core recursive serializer. Serializes an arbitrary value into a JSON string fragment.
	//
	// The encoding pipeline per element (from the spec) is:
	//   raw value → toJSON(key) → replacer(key, value) → serialize()
	//
	// This function handles the final "serialize" step plus some early-exit checks.
	// toJSON and replacer are applied at each call site *before* this is invoked.

	// Tracks objects currently being serialized so we can detect circular references.
	const seenObjects = new Set<object>()

	// The serialize inner function
	function serialize(obj: any): string {
		const typeofObj = typeof obj

		// --- Primitives ---

		// null and booleans stringify directly.
		if (obj === null || typeofObj === 'boolean') {
			return String(obj)
		}

		// Numbers: NaN and Infinity are not valid JSON values.
		// Per spec they become `null`.
		if (typeofObj === 'number') {
			if (isNaN(obj) || obj === Infinity || obj === -Infinity) {
				return 'null'
			}

			return String(obj)
		}

		// Strings must be quoted and have control characters / lone surrogates escaped.
		if (typeofObj === 'string') {
			return `"${escapeStringIfNeeded(obj)}"`
		}

		// Anything that isn't an object at this point (e.g. bigint, function, symbol)
		// cannot be meaningfully serialized. The spec says throw a TypeError.
		if (typeofObj !== 'object') {
			throw new TypeError(`Type '${typeofObj}' cannot be serialized in JSON`)
		}

		// --- Object/Array handling ---

		// Circular reference guard: if we encounter the same object reference twice
		// in the same serialization tree, throw a TypeError like native JSON.stringify.
		if (seenObjects.has(obj)) {
			throw new TypeError('A circular object cannot be serialized to JSON')
		}

		// Boxed primitive unwrapping:
		// new Number(5), new String("hi"), new Boolean(true) are objects but should
		// serialize as their primitive value. Object.prototype.toString identifies them.
		const objectTag = Object.prototype.toString.call(obj)

		if (objectTag === '[object Number]' || objectTag === '[object String]' || objectTag === '[object Boolean]') {
			return serialize(obj.valueOf())
		}

		// Mark this object as currently-being-serialized for cycle detection.
		// It is removed when encoding of this sub-tree completes.
		seenObjects.add(obj)

		let str: string

		if (Array.isArray(obj)) {
			// --- Array serialization ---
			str = '['

			let isFirstElement = true

			for (let elementIndex = 0; elementIndex < obj.length; elementIndex++) {
				let element = obj[elementIndex]

				// Step 1: Apply toJSON if present (first transformation in the pipeline).
				if (typeof element?.toJSON === 'function') {
					// Pass the current element index, as string to `toJSON`
					element = element.toJSON(String(elementIndex))
				}

				// Step 2: Apply function replacer (not whitelist — whitelists don't filter array elements).
				// The replacer is called with `this` set to the array, key = stringified index.
				if (replacerFunc !== undefined && !hasWhitelistReplacer) {
					element = replacerFunc.call(obj, String(elementIndex), element)
				}

				// Increase indent level
				currentIndentLevel += 1

				// Step 3: Serialize.
				// undefined / functions / symbols in arrays become `null` (they can't be omitted
				// because arrays are positional — skipping would shift indices).
				let encodedElement: string

				if (element === undefined || typeof element === 'function' || typeof element === 'symbol') {
					encodedElement = 'null'
				} else {
					encodedElement = serialize(element)
				}

				// Add comma between elements
				// suppressed before the first element.
				const separatingComma = isFirstElement === true ? '' : ','
				const indentString = getIndentString()

				str += `${separatingComma}${indentString}${encodedElement}`

				// Decrease indent level
				currentIndentLevel -= 1

				isFirstElement = false
			}

			// Close the array.
			// If it had elements, add a trailing newline+indent before ']'.
			if (!isFirstElement) {
				str += getIndentString()
			}

			str += ']'
		} else {
			// --- Plain object serialization ---
			str = '{'

			let isFirstEntry = true

			for (const key in obj) {
				// Only serialize own enumerable properties (skip inherited ones).
				if (!Object.prototype.hasOwnProperty.call(obj, key)) {
					continue
				}

				let value = obj[key]

				// Step 1: Apply toJSON if present.
				if (typeof value?.toJSON === 'function') {
					value = value.toJSON(key)
				}

				// Step 2: Apply replacer (function or whitelist — both filter object properties).
				// The replacer is called with `this` set to the owner object.
				if (replacerFunc !== undefined) {
					value = replacerFunc.call(obj, key, value)
				}

				// Step 3: Skip properties whose value is undefined, function, or symbol.
				// Unlike arrays, objects can omit such keys entirely.
				if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
					continue
				}

				// Increase indent level
				currentIndentLevel += 1

				// Initialize strings
				const separatingComma = isFirstEntry === true ? '' : ','
				const indentString = getIndentString()
				const escapedKey = escapeStringIfNeeded(key)
				// Add a space after the colon only when indentation is active (improves readability).
				const spaceAfterColons = baseIndentString.length > 0 ? ' ' : ''

				// Step 4: Serialize the value.
				const encodedValue = serialize(value)

				str += `${separatingComma}${indentString}"${escapedKey}":${spaceAfterColons}${encodedValue}`

				// Decrease indent level
				currentIndentLevel -= 1

				isFirstEntry = false
			}

			// Close the object. If it had entries, add a trailing newline+indent before '}'.
			if (!isFirstEntry) {
				str += getIndentString()
			}

			str += '}'
		}

		// Done encoding this sub-tree; remove from the set so sibling branches
		// that reference the same object are allowed (e.g. DAGs, not just trees).
		seenObjects.delete(obj)

		return str
	}

	// --- Root-level processing ---
	//
	// The root value gets the full pipeline outside of serialize():
	//   toJSON → replacer → type guard → serialize
	let rootValue = obj

	// Step 1: Apply toJSON on the root value (with key '').
	if (typeof rootValue?.toJSON === 'function') {
		rootValue = rootValue.toJSON('')
	}

	// Step 2: Apply replacer on the root value.
	// The spec passes the root through a temporary holder { '': rootValue } so that
	// the replacer receives key '' and `this` = the holder object.
	if (replacerFunc !== undefined) {
		const holder = { '': obj }
		rootValue = replacerFunc.call(holder, '', rootValue)
	}

	// Step 3: If the root value is undefined/function/symbol at this point,
	// there is nothing to serialize — return the JS value `undefined`.
	// (This matches JSON.stringify(() => {}) → undefined.)
	if (rootValue === undefined || typeof rootValue === 'function' || typeof rootValue === 'symbol') {
		return undefined
	}

	// Step 4: Serialize the processed root value.
	return serialize(rootValue)
}

// Returns the input string as-is if it doesn't contain any characters that need escaping,
// otherwise delegates to escapeString(). This is an optimization: most strings are safe
// and can skip the per-character loop.

// The regex matches:
//
// * `"` (U+0022) — must be escaped so it doesn't terminate the JSON string
//  * `\` (U+005C) — must be escaped so it doesn't start an escape sequence
// * `\x00-\x1F` (C0 control characters) — must be escaped per JSON spec
// * `\uD800-\uDFFF` (lone surrogates) — must be escaped so the output is valid UTF-16
function escapeStringIfNeeded(str: string): string {
	if (!/["\\\x00-\x1F\uD800-\uDFFF]/.test(str)) {
		return str
	} else {
		return escapeString(str)
	}
}

// Escapes a string for inclusion in a JSON string literal.
//
// Per the JSON spec and ECMAScript §24.5.2 (JSON.stringify), the following
// characters are escaped:
//   * `"` → `\"`
//   * `\` → `\\`
//   * Control characters (code points < 0x20) → `\n`, `\r`, `\t`, `\f`, `\b`, or `\uXXXX`
//   * Lone surrogates (0xD800–0xDFFF) → `\uXXXX` (ES2019+ requirement)
//
// Valid surrogate *pairs* (high + low) are passed through unescaped — they form
// a single Unicode code point and are valid in JSON.
function escapeString(str: string): string {
	let escapedStr = ''

	for (let charIndex = 0; charIndex < str.length; charIndex++) {
		const charCode = str.charCodeAt(charIndex)

		if (charCode >= 0xD800 && charCode <= 0xDFFF) {
			// --- Lone surrogates (0xD800–0xDFFF) ---
			// These must be escaped as \uXXXX so the resulting JSON string is valid UTF-16.
			escapedStr += `\\u${charCodeTo4HexDigits(charCode)}`
		} else if (charCode >= 32) {
			// --- Printable ASCII and higher ---
			// Only two printable characters need escaping in JSON strings.
			if (charCode === 34) { // '"'
				escapedStr += '\\"'
			} else if (charCode === 92) { // '\\'
				escapedStr += '\\\\'
			} else {
				escapedStr += String.fromCharCode(charCode)
			}
		} else {
			// --- Control characters (< 0x20) ---
			// Common ones get short escape sequences; everything else uses \uXXXX.
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
				escapedStr += `\\u${charCodeTo4HexDigits(charCode)}`
			}
		}
	}

	return escapedStr
}
