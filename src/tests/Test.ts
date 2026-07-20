import { JsonReviverFunction, parse, parseJSON } from '../exports/Exports.js'
import { testJson5Encoder } from './Json5EncoderTest.js'
import { testJson5Parser, testJson5ParserInvalidInputs } from './Json5ParserTests.js'
import { testJsonEncoder } from './JsonEncoderTests.js'
import { testJsonParser, testJsonParserInvalidInputs } from './JsonParserTests.js'

//testJsonEncoder()
testJsonParser()
//testJsonParserInvalidInputs()

//testJson5Encoder()
testJson5Parser()
//testJson5ParserInvalidInputs()
