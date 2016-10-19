const escape = require('lodash/escape')

function htmlPage({ title, metaHTML = '', bodyClasses = [], bodyHTML }) {
    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ escape(title) }</title>
${ metaHTML }
</head>
<body class="${ bodyClasses.join(' ') }">
${ bodyHTML }
</body>
</html>
`
}

module.exports = htmlPage
