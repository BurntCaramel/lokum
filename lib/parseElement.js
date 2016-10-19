const R = require('ramda')
const parseInt = require('lodash/parseInt')

const rejectEmptyStrings = require('./rejectEmptyStrings')

const tagsRegex = /\B#\w+(:\s*\S*)?/g

const parseText = R.pipe(
	R.replace(/\B#\w*(:\s*\S*)?/g, ''), // remove tags
	R.replace(/\B@\w*(.\w*)*/g, ''), // remove mentions
	R.replace(/\s+/g, ' '), // clean up spaces
	R.trim
)

const parseMentions = R.pipe(
	R.match(/@(\w+)(.\w*)*/g), // match references
	R.map(R.tail),
	rejectEmptyStrings,
	R.map(R.pipe(
		R.trim,
		R.split('.'),
		rejectEmptyStrings,
		R.map(R.when(
			R.test(/^\d/), // Starts with a digit
			parseInt // Convert to number
		))
	))
)

const parseTagContent = R.converge(
	(text, references) => ({ text, references }),
	[
		parseText,
		parseMentions
	]
)

const parseTags = R.pipe(
	R.match(tagsRegex), // match tags,
	R.map(R.pipe(
		R.match(/\B#([a-zA-Z0-9-_]+)(:\s*(\S*))?/), // capture tag elements,
		R.props([1, 3]),
		R.adjust(
			R.pipe(
				R.when(
					R.is(String),
					parseTagContent
				),
				R.defaultTo(true)
			),
			1
		)
	)),
	R.fromPairs
)

const parseElement = R.converge(
	(text, tags, references) => ({ text, tags, references, children: [] }),
	[
		parseText,
		parseTags,
		R.pipe(
			R.replace(tagsRegex, ''),
			parseMentions
		)
	]
)

module.exports = parseElement
