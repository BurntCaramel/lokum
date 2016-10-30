'use strict';

var R = require('ramda');
var parseInt = require('lodash/parseInt');

var rejectEmptyStrings = require('./rejectEmptyStrings');

var tagsRegex = /\B#\w+(:\s*[^#]*)?/g;

var parseText = R.pipe(R.replace(/\B#.+/g, ''), // remove tags
R.replace(/\B@\w*(.\w*)*/g, ''), // remove mentions
R.replace(/\s+/g, ' '), // clean up spaces
R.trim);

var parseMentions = R.pipe(R.match(/@(\w+)(.\w*)*/g), // match references
R.map(R.tail), rejectEmptyStrings, R.map(R.pipe(R.trim, R.split('.'), rejectEmptyStrings, R.map(R.when(R.test(/^\d/), // Starts with a digit
parseInt // Convert to number
)))));

var parseTagContent = R.converge(function (text, references) {
	return { text: text, references: references };
}, [parseText, parseMentions]);

var parseTags = R.pipe(R.match(tagsRegex), // match tags,
R.map(R.pipe(R.match(/\B#([a-zA-Z0-9-_]+)(:\s*([^#]*))?/), // capture tag elements,
R.props([1, 3]), R.adjust(R.pipe(R.when(R.is(String), parseTagContent), R.defaultTo(true)), 1))), R.fromPairs);

var parseElement = R.converge(function (text, tags, references) {
	return { text: text, tags: tags, references: references, children: [] };
}, [parseText, parseTags, R.pipe(R.replace(tagsRegex, ''), parseMentions)]);

module.exports = parseElement;