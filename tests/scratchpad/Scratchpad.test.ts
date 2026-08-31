import { test, expect } from 'vitest'
import { parseJSON, parseJSON5, stringifyJSON, stringifyJSON5 } from '../../src/exports/Exports.ts'
import { JsonParserError } from '../../src/parser/JsonParserError.ts'

// Use this file and directory to write temporary tests while investigating
// suspected bugs. Promoted tests have been moved to the parent directory:
//
// - tests/InvalidLiterals.test.ts       (escape sequence validation & diagnostics)
// - tests/NumberLiteralAccuracy.test.ts (literal-to-number conversion accuracy)
// - tests/DifferentialFuzz.test.ts      (parseJSON5 vs JSON.parse fuzzing)

test('parseJSON', () => {
  const result = parseJSON('{"a":1,"b":2}')
  expect(result).toEqual({ a: 1, b: 2 })
})

test('parseJSON5', () => {
  const result = parseJSON5('{"a":1,"b":2}')
  expect(result).toEqual({ a: 1, b: 2 })
})
