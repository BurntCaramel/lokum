const Remarkable = require('remarkable')

const md = new Remarkable('full', {
	html: true,
	xhtmlOut: false,
	breaks: false,
	linkify: true
})

const renderMarkdown = (input) => md.render(input)

module.exports = renderMarkdown
