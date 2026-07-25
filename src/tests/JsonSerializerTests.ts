import { stringifyJSON, stringifyJSON5 } from '../serializer/JsonSerializer.js'

const print = console.log

export function testJsonEncoder() {
	const obj1 = {
		hi: 123,
		there: [
			1,
			2,
			3
		],
		yo: {
			boom: 'asdf',
			ba: {
				go: 65
			}
		}
	}

	const obj2 = [
		{
			hi: 123,
			there: [
				1,
				2,
				3
			],
			yo: {
				boom: 'asdf',
				ba: {
					go: 65
				}
			},

			bee: [`'😅hey \n	🙃'`, `😅hey🙃`]
		}
	]

	const obj = obj2

	const replacer = undefined
	const space = 4

	const reference = JSON.stringify(obj, replacer, space)
	const resultJson = stringifyJSON(obj, replacer, space)
	const resultJson5 = stringifyJSON5(obj, replacer, space)

	const output = `
Reference JSON.stringify:

${reference}

This JSON encoder:

${resultJson}

This JSON5 encoder:

${resultJson5}
`

	print(output)

	const r = stringifyJSON5('😅hey🙃', replacer, space)
}
