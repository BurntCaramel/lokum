const escape = require('lodash/escape')

const selfClosingTags = new Set(['img', 'link', 'br'])

function htmlElement(tagName, attributes, text) {
    const attributeString = Object.keys(attributes).reduce((list, name) => {
        const value = attributes[name]
        if (value != null) {
            list.push(`${name}="${ escape(value) }"`)
        }
        return list
    }, []).join(' ')

    if (selfClosingTags.has(tagName)) {
        return `<${tagName} ${attributeString}>`
    }

    text = text.trim()

    if (text[0] != '<') {
        text = escape(text)
    }

    return `<${tagName} ${attributeString}>${ text }</${tagName}>`
}

module.exports = htmlElement;
