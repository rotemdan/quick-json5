import { testJson5Parser, testJson5ParserInvalidInputs } from './Json5ParserTests.js'
import { testJsonEncoder } from './JsonSerializerTests.js'
import { testJsonParser, testJsonParserInvalidInputs } from './JsonParserTests.js'

testJsonEncoder()

testJsonParser()
//testJsonParserInvalidInputs()

testJson5Parser()
//testJson5ParserInvalidInputs()
