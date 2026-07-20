
const whitespaceCharactersCharCodesSet = new Set([
	// White space characters:
	0x0009, // Horizontal tab
	0x000A, // Line feed
	0x000B, // Vertical tab
	0x000C, // Form feed
	0x000D, // Carriage return
	0x0020, // Space
	0x00A0, // Non-breaking space
	0x2028, // Line separator
	0x2029, // Paragraph separator
	0xFEFF, // Byte order mark

	// Unicode extended "Space Separator" category
	0x0020, // Space (SP) - already included above, but listed again in the second list
	0x00A0, // No-Break Space (NBSP) - already included above, but listed again in the second list
	0x1680, // Ogham Space Mark
	0x2000, // En Quad
	0x2001, // Em Quad
	0x2002, // En Space
	0x2003, // Em Space
	0x2004, // Three-Per-Em Space
	0x2005, // Four-Per-Em Space
	0x2006, // Six-Per-Em Space
	0x2007, // Figure Space
	0x2008, // Punctuation Space
	0x2009, // Thin Space
	0x200A, // Hair Space
	0x202F, // Narrow No-Break Space (NNBSP)
	0x205F, // Medium Mathematical Space (MMSP)
	0x3000, // Ideographic Space
])

// Sorted whitespace character ranges:
//
// 0x0009 - 0x000D
// 0x0020
// 0x00A0
//
// 0x1680

// 0x2000 - 0x200A
// 0x2028
// 0x2029
// 0x202F
// 0x205F

// 0x3000
// 0xFEFF

