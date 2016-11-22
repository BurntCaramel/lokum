const escape = require('lodash/escape')
const R = require('ramda')

const attributePair = (key, value) => !!value ? `${ key }="${ escape(value) }"` : ''

const ampScript = '<script async src="https://cdn.ampproject.org/v0.js"></script>'

const ampBoilerplateStyle = `<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>`

function htmlPage({ title, metaHTML = '', bodyClasses = [], bodyHTML, language, amp = false }) {
    return (
`<!doctype html>
<html${ amp ? ' amp' : '' }${ attributePair('lang', language) }>
<head>
<meta charset="utf-8">${ amp ? ampScript : '' }
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ escape(title) }</title>
${ amp ? '' : metaHTML }${ amp ? ampBoilerplateStyle : '' }
</head>
<body class="${ bodyClasses.join(' ') }">
${ bodyHTML }
</body>
</html>
`)
}

module.exports = htmlPage
