'use strict';

var Remarkable = require('remarkable');

var md = new Remarkable('full', {
	html: true,
	xhtmlOut: false,
	breaks: false
});

var renderMarkdown = function renderMarkdown(input) {
	return md.render(input);
};

module.exports = renderMarkdown;