import { stringify } from '../json5/Json5Encoder.js'

const print = console.log

export function testJson5Encoder() {
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
			}
		}
	]

	const obj = obj2

	const replacer = undefined
	const space = 4

	const reference = JSON.stringify(obj, replacer, space)
	const result = stringify(obj, replacer, space)

	print('JSON.stringify:')
	print(reference)

	print('\n\nencodeJson:')
	print(result)
}
