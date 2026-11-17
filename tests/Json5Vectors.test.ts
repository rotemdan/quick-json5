import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSON5 from 'json5'
import { test, expect } from 'vitest'
import { JsonParserError, parseJSON5 } from '../src/exports/Exports.ts'

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/json5-tests')
const featureDirectories = [
	'arrays',
	'comments',
	'misc',
	'new-lines',
	'numbers',
	'objects',
	'strings',
	'todo',
]
const testFileExtensions = new Set(['.json', '.json5', '.js', '.txt'])

const vectorCases = featureDirectories
	.flatMap((directory) => findTestFiles(join(fixtureRoot, directory)))
	.sort()
	.map((filePath) => ({
		id: relative(fixtureRoot, filePath).split(sep).join('/'),
		contents: readFileSync(filePath, 'utf8'),
		extension: extname(filePath),
	}))

test.each(vectorCases)('JSON5 parser handles $id', ({ contents, extension }) => {
	if (extension === '.json' || extension === '.json5') {
		expect(parseJSON5(contents)).toEqual(JSON5.parse(contents))
	} else {
		expect(() => parseJSON5(contents)).toThrow(JsonParserError)
	}
})

function findTestFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const filePath = join(directory, entry.name)

		if (entry.isDirectory()) {
			return findTestFiles(filePath)
		}

		return testFileExtensions.has(extname(entry.name)) ? [filePath] : []
	})
}
