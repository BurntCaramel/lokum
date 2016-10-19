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

function groupCards(cards) {
    let [ metaCards, notMetaCards ] = R.partition((card) => (card.name === '#meta'), cards)
    let [ aboveCards, notAboveCards ] = R.partition((card) => (card.name === '#above'), notMetaCards)
    return { metaCards, aboveCards, contentCards: notAboveCards }
}

function cardsForID(allCards, listID) {
    return allCards.filter((card) => (card.idList === listID) && (!card.closed))
}

function routesForTrelloData({ lists, cards: allCards }) {
    const globalLists = lists.filter(({ name }) => name === '#all')
    const globalCardsGrouped = R.chain(({ id: listID }) => (
        groupCards(
            cardsForID(allCards, listID)
        )
    ), globalLists)
    // Meta
    const globalMetaCards = R.chain(({ metaCards }) => metaCards, globalCardsGrouped)
    // Above
    const globalAboveCards = R.chain(({ aboveCards }) => aboveCards, globalCardsGrouped)
    const { html: globalAboveHTML } = htmlForCards(globalAboveCards)

    return lists.reduce((routes, { name: listName, id: listID }) => {
        const { text: title, tags } = parseElement(listName)
        const path = resolveContent(tags.path)
        if (path == null || path.length === 0) {
            return routes
        }

        const bodyClasses = (resolveContent(tags.class) || '').split(' ')

        const cards = cardsForID(allCards, listID)
        const { metaCards, contentCards } = groupCards(cards)

        const bodyHTML = globalAboveHTML + contentHTMLForTrelloCards(contentCards, title)
        const metaHTML = metaHTMLForTrelloCards(globalMetaCards.concat(metaCards))
        const html = output = htmlTemplate({
            title,
            metaHTML,
            bodyClasses,
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

const articleMode = {
    sectionTag: 'section',
    itemTag: 'article'
}

const navMode = {
    sectionTag: 'nav',
    itemTag: 'div'
}

function htmlForCards(cards, { mode = {}, title } = {}) {
    let sectionAttributes = {}
    let itemAttributes = {}

    let content = cards.map(({ name, attachments, desc }) => {
        const { text, tags } = parseElement(name)

        if (tags.nav) {
            mode = navMode
            itemAttributes = {}

            let className = resolveContent(tags.class) || ''
            if (tags.primary) {
                className += ' primary'
            }

            className = className.trim()
            if (className.length > 0) {
                sectionAttributes.class = className
            }
            return ''
        }

        if (tags.article) {
            mode = articleMode
            itemAttributes = {}
            const className = resolveContent(tags.class)
            if (className) {
                itemAttributes.class = className
            }
            return ''
        }

        let output

        if (tags.primary) {
            output = ''
            title = text
        }
        else if (text.length > 0) {
            output = text

            const url = resolveContent(tags.link)
            if (url) {
                output = htmlElement('a', { href: url }, output)
            }

            let tagName = 'h2'

            output = htmlElement(tagName, {
                class: resolveContent(tags.class)
            }, output)
        }
        else {
            output = ''
        }

        output += R.chain(({ previews }) => {
            if (!previews) { return [] }

            const preview = R.last(previews)
            if (!preview) { return [] }

            return htmlElement('img', { src: preview.url, width: preview.width, height: preview.height })
        }, attachments).join('\n')

        if (desc && desc.length > 0) {
            output += renderMarkdown(desc)
        }

        if (output.length === 0) {
            return ''
        }

        if (mode.itemTag) {
            output = htmlElement(mode.itemTag, itemAttributes, output) + '\n'
        }

        return output
    }).join('\n')

    if (mode.sectionTag) {
        content = htmlElement(mode.sectionTag, sectionAttributes, content) + '\n'
    }

    return { html: content, title }
}

function contentHTMLForTrelloCards(cards, title) {
    let { html: contentHTML, title: adjustedTitle } = htmlForCards(cards, { mode: articleMode, title })

    // Add header
    if (adjustedTitle != null && adjustedTitle.length > 0) {
        const header = htmlElement('header', {}, htmlElement('h1', {}, adjustedTitle))
        contentHTML = `\n${header}\n${contentHTML}\n`
    }

    return htmlElement('main', { class: 'content' }, contentHTML)
}

function metaHTMLForTrelloCards(cards) {
    return cards.map(({ desc }) => {
        return desc
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
