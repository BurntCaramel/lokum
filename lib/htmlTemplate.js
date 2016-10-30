'use strict';

var escape = require('lodash/escape');

function htmlPage(_ref) {
    var title = _ref.title,
        _ref$metaHTML = _ref.metaHTML,
        metaHTML = _ref$metaHTML === undefined ? '' : _ref$metaHTML,
        _ref$bodyClasses = _ref.bodyClasses,
        bodyClasses = _ref$bodyClasses === undefined ? [] : _ref$bodyClasses,
        bodyHTML = _ref.bodyHTML;

    return '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escape(title) + '</title>\n' + metaHTML + '\n</head>\n<body class="' + bodyClasses.join(' ') + '">\n' + bodyHTML + '\n</body>\n</html>\n';
}

module.exports = htmlPage;