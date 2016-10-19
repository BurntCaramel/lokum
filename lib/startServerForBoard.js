const Hapi = require('hapi')
const Axios = require('axios')
const R = require('ramda')
const escape = require('lodash/escape')

const parseElement = require('./parseElement')
const renderMarkdown = require('./renderMarkdown')
const htmlTemplate = require('./htmlTemplate')


const server = new Hapi.Server()
server.connection({
	address: process.env.HOST,
	port: (process.env.PORT || 80)
})


let state = {
}

function routesForTrelloData({ lists, cards: allCards }) {
    return lists.reduce((routes, { name: listName, id: listID }) => {
        const { text: title, tags: { path: { text: path } } } = parseElement(listName)
        if (path == null || path.length === 0) {
            return routes
        }

        const cards = allCards.filter((card) => (card.idList === listID))
        const [ metaCards, contentCards ] = R.partition((card) => (card.name === '#meta'), cards)

        const bodyHTML = contentHTMLForTrelloCards(contentCards)
        const metaHTML = metaHTMLForTrelloCards(metaCards)
        const html = output = htmlTemplate({
            title,
            metaHTML,
            bodyHTML
        })

        routes.push({
            method: 'GET',
            path,
            handler(request, reply) {
                reply(html)
            }
        })

        return routes
    }, [])
}

function resolveContent(content) {
    if (!content || content == true) {
        return
    }

    if (content.text) {
        return content.text
    }
}

const selfClosingTags = new Set(['img', 'link', 'br'])

function htmlElement(tagName, attributes, text) {
    const attributeString = Object.keys(attributes).reduce((list, name) => {
        const value = attributes[name]
        list.push(`${name}="${ escape(value) }"`)
        return list
    }, []).join(' ')

    if (selfClosingTags.has(tagName)) {
        return `<${tagName} ${attributeString}>`
    }

    if (text[0] != '<') {
        text = escape(text)
    }

    return `<${tagName} ${attributeString}>${ text }</${tagName}>`
}

function contentHTMLForTrelloCards(cards) {
    return cards.map(({ name, attachments, desc }) => {
        const { text, tags } = parseElement(name)
        let output = text

        const url = resolveContent(tags.link)
        if (url) {
            output = htmlElement('a', { href: url }, output)
        }

        let tagName = 'h2'
        if (tags.primary) {
            tagName = 'h1'
        }

        output = htmlElement(tagName, {}, output)

        //output += JSON.stringify(attachments, null, 2)

        output += R.chain(({ previews }) => {
            if (!previews) { return [] }

            const preview = R.last(previews)
            if (!preview) { return [] }

            return htmlElement('img', { src: preview.url, width: preview.width, height: preview.height })
        }, attachments).join('\n')

        if (desc && desc.length > 0) {
            output += renderMarkdown(desc)
        }

        output = htmlElement('article', {}, output)

        output = htmlElement('main', { class: 'content' }, output)

        return output
    }).join('\n')
}

function metaHTMLForTrelloCards(cards) {
    return cards.map(({ desc }) => {
        return renderMarkdown(desc)
    }).join('\n')
}

function startServerForBoard(boardID) {
    Axios.get(`https://trello.com/b/${ boardID }.json`)
    .then(response => {
        console.log('loaded from trello')
        state.json = response.data

        server.route({
            method: 'GET',
            path: '/-debug',
            handler(request, reply) {
                reply(JSON.stringify(state.json, null, 2))
            }
        })

        server.route(routesForTrelloData(state.json))
            
        server.start()

        // Prevent exit
        process.stdin.resume()

        console.log('Started server')
    })
    .catch(error => {
        console.error(error)
    })
}

module.exports = startServerForBoard
