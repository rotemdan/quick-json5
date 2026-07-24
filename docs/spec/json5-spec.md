# The JSON5 Data Interchange Format

## Abstract

The JSON5 Data Interchange Format is a proposed extension to JSON that aims to make it easier for humans to write and maintain by hand. It does this by adding some minimal syntax features directly from ECMAScript 5.1.

## 1 Introduction

The JSON5 Data Interchange Format (JSON5) is a superset of [JSON](https://tools.ietf.org/html/rfc7159) that aims to alleviate some of the limitations of JSON by expanding its syntax to include some productions from [ECMAScript 5.1](https://www.ecma-international.org/ecma-262/5.1/).

Similar to JSON, JSON5 can represent four primitive types (strings, numbers, Booleans, and null) and two structured types (objects and arrays).

A string is a sequence of zero or more [Unicode](http://www.unicode.org/versions/latest/) characters. Note that this citation references the latest version of Unicode rather than a specific release. It is not expected that future changes in the Unicode specification will impact the syntax of JSON5.

An object is an unordered collection of zero or more name/value pairs, where a name is a string or identifier and a value is a string, number, Boolean, null, object, or array.

An array is an ordered sequence of zero or more values.

### 1.1 Summary of Features

The following ECMAScript 5.1 features, which are not supported in JSON, have been extended to JSON5.

#### Objects

- Object keys may be an ECMAScript 5.1 [IdentifierName](https://www.ecma-international.org/ecma-262/5.1/#sec-7.6).
- Objects may have a single trailing comma.

#### Arrays

- Arrays may have a single trailing comma.

#### Strings

- Strings may be single quoted.
- Strings may span multiple lines by escaping new line characters.
- Strings may include character escapes.

#### Numbers

- Numbers may be hexadecimal.
- Numbers may have a leading or trailing decimal point.
- Numbers may be [IEEE 754](http://ieeexplore.ieee.org/servlet/opac?punumber=4610933) positive infinity, negative infinity, and NaN.
- Numbers may begin with an explicit plus sign.

#### Comments

- Single and multi-line comments are allowed.

#### White Space

- Additional white space characters are allowed.

### 1.2 Short Example

```javascript
{
  // comments
  unquoted: 'and you can quote me on that',
  singleQuotes: 'I can use "double quotes" here',
  lineBreaks: "Look, Mom! \
No \\n's!",
  hexadecimal: 0xdecaf,
  leadingDecimalPoint: .8675309, andTrailing: 8675309.,
  positiveSign: +1,
  trailingComma: 'in objects', andIn: ['arrays',],
  "backwardsCompatible": "with JSON",
}
```

## 2 Values

A JSON5 value must be an [object](#objects), [array](#arrays), [string](#strings), or [number](#numbers), or one of the three literal names `true`, `false`, or `null`.

```
JSON5Value:
  JSON5Null
  JSON5Boolean
  JSON5String
  JSON5Number
  JSON5Object
  JSON5Array
```

## 3 Objects

An object structure is represented as a pair of curly brackets surrounding zero or more name/value pairs (or members). A name is a string or identifier. A single colon comes after each name, separating the name from the value. A single comma separates a value from a following name. A single comma may follow the name/value pair. The names within an object should be unique.

```
JSON5Object:
  { }
  { JSON5MemberList ,_opt }

JSON5MemberList:
  JSON5Member
  JSON5MemberList , JSON5Member

JSON5Member:
  JSON5MemberName : JSON5Value

JSON5MemberName:
  JSON5Identifier
  JSON5String
```

An object whose names are all unique is interoperable in the sense that all software implementations receiving that object will agree on the name-value mappings. When the names within an object are not unique, the behavior of software that receives such an object is unpredictable. Implementations may report the last name/value pair only, report an error or fail to parse the object, or report all of the name/value pairs, including duplicates.

Implementations may make the ordering of object members visible to calling software. Implementations whose behavior does not depend on member ordering will be interoperable in the sense that they will not be affected by this.

```javascript
// An empty object
{}

// An object with two properties
// and a trailing comma
{
    width: 1920,
    height: 1080,
}

// Objects can be nested
{
    image: {
        width: 1920,
        height: 1080,
        'aspect-ratio': '16:9',
    }
}

// An array of objects
[
    { name: 'Joe', age: 27 },
    { name: 'Jane', age: 32 },
]
```

## 4 Arrays

An array structure is represented as square brackets surrounding zero or more values (or elements). Elements are separated by commas. A single comma may follow the final element.

```
JSON5Array:
  [ ]
  [ JSON5ElementList ,_opt ]

JSON5ElementList:
  JSON5Value
  JSON5ElementList , JSON5Value
```

There is no requirement that the values in an array be of the same type.

```javascript
// An empty array
[]

// An array with three elements
// and a trailing comma
[
    1,
    true,
    'three',
]

// Arrays can be nested
[
    [1, true, 'three'],
    [4, "five", 0x6],
]
```

## 5 Strings

A string begins and ends with single or double quotation marks. The same quotation mark that begins a string must also end the string. All Unicode characters may be placed within the quotation marks, except for the characters that must be escaped: the quotation mark used to begin and end the string, reverse solidus, and line terminators.

```
JSON5String ::
  " JSON5DoubleStringCharacters_opt "
  ' JSON5SingleStringCharacters_opt '

JSON5DoubleStringCharacters ::
  JSON5DoubleStringCharacter JSON5DoubleStringCharacters_opt

JSON5SingleStringCharacters ::
  JSON5SingleStringCharacter JSON5SingleStringCharacters_opt

JSON5DoubleStringCharacter ::
  SourceCharacter but not one of " or \ or LineTerminator
  \ EscapeSequence
  LineContinuation
  U+2028
  U+2029

JSON5SingleStringCharacter ::
  SourceCharacter but not one of ' or \ or LineTerminator
  \ EscapeSequence
  LineContinuation
  U+2028
  U+2029
```

### 5.1 Escapes

Any character may be escaped. If the character is in the Basic Latin or Latin-1 Supplement Unicode character ranges (U+0000 through U+00FF), then it may be represented as a four-character sequence: a reverse solidus, followed by the lower case letter `x`, followed by two hexadecimal digits that encode the character's code point. A reverse solidus followed by the lower case letter `x` must be followed by two hexadecimal digits.

If the character is in the Basic Multilingual Plane (U+0000 through U+FFFF), then it may be represented as a six-character sequence: a reverse solidus, followed by the lower case letter `u`, followed by four hexadecimal digits that encode the character's code point. A reverse solidus followed by the lower case letter `u` must be followed by four hexadecimal digits. The hexadecimal letters A though F can be upper or lower case.

> A string containing only a single reverse solidus character may be represented as `'\x5C'` or `'\u005C'`.

To escape an extended character that is not in the Basic Multilingual Plane, the character is represented as a 12-character sequence, encoding the UTF-16 surrogate pair.

> A string containing only the musical score character 🎼 (U+1F3BC) may be represented as `'\uD83C\uDFBC'`.

Alternatively, there are two-character sequence escape representations of some popular characters. A decimal digit must not follow a reverse solidus followed by a zero.

| Escape Sequence | Description | Code Point |
|----------------|-------------|------------|
| `\'` | Apostrophe | U+0027 |
| `\"` | Quotation mark | U+0022 |
| `\\` | Reverse solidus | U+005C |
| `\b` | Backspace | U+0008 |
| `\f` | Form feed | U+000C |
| `\n` | Line feed | U+000A |
| `\r` | Carriage return | U+000D |
| `\t` | Horizontal tab | U+0009 |
| `\v` | Vertical tab | U+000B |
| `\0` | Null | U+0000 |

> A string containing only a single reverse solidus character may be represented more compactly as `'\\'`.

A string may be continued on a new line by following a reverse solidus with one of the following line terminator sequences. The reverse solidus and line terminator sequence are not included in the string.

| Code Points | Description |
|---|---|
| U+000A | Line feed |
| U+000D | Carriage return |
| U+000D U+000A | Carriage return and line feed |
| U+2028 | Line separator |
| U+2029 | Paragraph separator |

> The following strings represent the same information.
>
> ```javascript
> 'Lorem ipsum dolor sit amet, \
> consectetur adipiscing elit.'
>
> 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
> ```

If any other character follows a reverse solidus, except for the decimal digits 1 through 9, that character will be included in the string, but the reverse solidus will not.

> The following strings represent the same information.
>
> ```javascript
> '\A\C\/\D\C'
>
> 'AC/DC'
> ```

### 5.2 Paragraph and Line Separators

Like JSON, JSON5 allows the Unicode code points U+2028 and U+2029 to appear unescaped in strings. Since ECMAScript 5.1 does not allow these code points in strings, authors should avoid including them in JSON5 documents. JSON5 [parsers](#parsers) should produce a warning when they are found unescaped in strings. JSON5 [generators](#generators) should escape these code points in strings.

## 6 Numbers

The representation of numbers is similar to that used in most programming languages. A number may be represented in in base 10 using decimal digits, base 16 using hexadecimal digits, or the IEEE 754 values positive infinity, negative infinity, or NaN.

```
JSON5Number ::
  JSON5NumericLiteral
  + JSON5NumericLiteral
  - JSON5NumericLiteral

JSON5NumericLiteral ::
  NumericLiteral
  Infinity
  NaN
```

Decimal numbers contain an integer component that may be prefixed with an optional plus or minus sign, which may be followed by a fraction part and/or an exponent part.

A fraction part is a decimal point followed by one or more digits.

An exponent part begins with the letter E in upper or lower case, which may be followed by a plus or minus sign. The E and optional sign are followed by one or more digits.

```javascript
{
    integer: 123,
    withFractionPart: 123.456,
    onlyFractionPart: .456,
    withExponent: 123e-456,
}
```

Hexadecimal numbers contain the literal characters `0x` or `0X` that may be prefixed with an optional plus or minus sign, which must be followed by one or more hexadecimal digits. The hexadecimal letters A through F can be upper or lower case.

```javascript
{
    positiveHex: 0xdecaf,
    negativeHex: -0xC0FFEE,
}
```

The IEEE 754 value positive infinity must be the literal characters `Infinity` and may be prefixed with an optional plus sign.

The IEEE 754 value negative infinity must be the literal characters `-Infinity`.

The IEEE 754 value NaN must be the literal characters `NaN` and may be prefixed with an optional plus or minus sign.

```javascript
{
    positiveInfinity: Infinity,
    negativeInfinity: -Infinity,
    notANumber: NaN,
}
```

## 7 Comments

Comments can be either single or multi-line. Multi-line comments cannot nest. Comments may appear before and after any JSON5Token.

A single line comment begins with two soliduses and ends with a LineTerminator or the end of the document. All Unicode characters may be placed within the start and end, except for a LineTerminator.

A multi-line comment begins with a solidus and an asterisk and ends with an asterisk and a solidus. All Unicode characters may be placed within the start and end, except for an asterisk followed by a solidus.

```javascript
// This is a single line comment.

/* This is a multi-
   line comment. */
```

## 8 White Space

White space may appear before and after any JSON5Token.

| Code Points | Description |
|---|---|
| U+0009 | Horizontal tab |
| U+000A | Line feed |
| U+000B | Vertical tab |
| U+000C | Form feed |
| U+000D | Carriage return |
| U+0020 | Space |
| U+00A0 | Non-breaking space |
| U+2028 | Line separator |
| U+2029 | Paragraph separator |
| U+FEFF | Byte order mark |
| Unicode Zs category | Any other character in the Space Separator Unicode category |

## 9 Grammar

JSON5 is defined by a lexical grammar and a syntactic grammar. The lexical grammar defines productions that translate text into tokens, and the syntactic grammar defines productions that translate tokens into a JSON5 value.

All productions that do not begin with the characters "JSON5" are defined by productions of the [ECMAScript 5.1 Lexical Grammar](https://www.ecma-international.org/ecma-262/5.1/#sec-5.1.2).

### 9.1 Lexical Grammar

The lexical grammar for JSON5 has as its terminal symbols characters (Unicode code units) that conform to the rules for JSON5SourceCharacter. It defines a set of productions, starting from the [goal symbol](https://tc39.github.io/ecma262/#sec-context-free-grammars) JSON5InputElement, that describe how sequences of such characters are translated into a sequence of input elements.

Input elements other than white space and comments form the terminal symbols for the syntactic grammar for JSON5 and are called tokens. These tokens are the identifiers, literals, and punctuators of the JSON5 language. Simple white space and comments are discarded and do not appear in the stream of input elements for the syntactic grammar.

Productions of the lexical grammar are distinguished by having two colons "::" as separating punctuation.

```
JSON5SourceCharacter ::
  SourceCharacter

JSON5InputElement ::
  WhiteSpace
  LineTerminator
  Comment
  JSON5Token

JSON5Token ::
  JSON5Identifier
  JSON5Punctuator
  JSON5String
  JSON5Number

JSON5Identifier ::
  IdentifierName

JSON5Punctuator ::
  one of { } [ ] : ,

JSON5Null ::
  NullLiteral

JSON5Boolean ::
  BooleanLiteral

JSON5String ::
  " JSON5DoubleStringCharacters_opt "
  ' JSON5SingleStringCharacters_opt '

JSON5DoubleStringCharacters ::
  JSON5DoubleStringCharacter JSON5DoubleStringCharacters_opt

JSON5SingleStringCharacters ::
  JSON5SingleStringCharacter JSON5SingleStringCharacters_opt

JSON5DoubleStringCharacter ::
  SourceCharacter but not one of " or \ or LineTerminator
  \ EscapeSequence
  LineContinuation
  U+2028
  U+2029

JSON5SingleStringCharacter ::
  SourceCharacter but not one of ' or \ or LineTerminator
  \ EscapeSequence
  LineContinuation
  U+2028
  U+2029

JSON5Number ::
  JSON5NumericLiteral
  + JSON5NumericLiteral
  - JSON5NumericLiteral

JSON5NumericLiteral ::
  NumericLiteral
  Infinity
  NaN
```

### 9.2 Syntactic Grammar

The syntactic grammar for JSON5 has tokens defined by the lexical grammar as its terminal symbols. It defines a set of productions, starting from the [goal symbol](https://tc39.github.io/ecma262/#sec-context-free-grammars) JSON5Text, that describe how sequences of tokens can form syntactically correct JSON5 values.

When a stream of characters is to be parsed as a JSON5 value, it is first converted to a stream of input elements by repeated application of the lexical grammar; this stream of input elements is then parsed by a single application of the syntactic grammar. The program is syntactically in error if the tokens in the stream of input elements cannot be parsed as a single instance of the goal nonterminal JSON5Text, with no tokens left over.

Productions of the syntactic grammar are distinguished by having just one colon ":" as punctuation.

```
JSON5Text :
  JSON5Value

JSON5Value :
  JSON5Null
  JSON5Boolean
  JSON5String
  JSON5Number
  JSON5Object
  JSON5Array

JSON5Object :
  { }
  { JSON5MemberList ,_opt }

JSON5MemberList :
  JSON5Member
  JSON5MemberList , JSON5Member

JSON5Member :
  JSON5MemberName : JSON5Value

JSON5MemberName :
  JSON5Identifier
  JSON5String

JSON5Array :
  [ ]
  [ JSON5ElementList ,_opt ]

JSON5ElementList :
  JSON5Value
  JSON5ElementList , JSON5Value
```

## 10 Parsers

A JSON5 parser transforms a JSON5 text into another representation. A JSON5 parser must accept all texts that conform to the JSON5 [grammar](#grammar). A JSON5 parser may accept non-JSON5 forms or extensions.

An implementation may set limits on the size of texts that it accepts, the maximum depth of nesting, the range and precision of numbers, and the length and character contents of strings.

## 11 Generators

A JSON5 generator produces JSON5 text. The resulting text must strictly conform to the JSON5 [grammar](#grammar).

## A Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119). However, for readability, these words do not appear in all uppercase letters in this specification.

All of the text of this specification is normative except sections explicitly marked as non-normative, examples, and notes.

Examples in this specification are introduced with the words "for example" or are set apart from the normative text like this:

> This is an example of an informative example.

Informative notes begin with the word "Note" and are set apart from the normative text like this:

> **Note:** This is an informative note.

## B License

The MIT License (MIT)

Copyright (c) 2017 Aseem Kishore, Jordan Tucker

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
