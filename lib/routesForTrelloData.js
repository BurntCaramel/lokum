const R = require('ramda')
const parseElement = require('./parseElement')
const renderMarkdown = require('./renderMarkdown')
const htmlTemplate = require('./htmlTemplate')
const htmlElement = require('./htmlElement')

function groupCards(cards) {
    let [ metaCards, notMetaCards ] = R.partition((card) => (card.name === '#meta'), cards)
    let [ aboveCards, notAboveCards ] = R.partition((card) => (card.name === '#above'), notMetaCards)
    return { metaCards, aboveCards, contentCards: notAboveCards }
}

function cardsForID(allCards, listID) {
    return allCards.filter((card) => (card.idList === listID) && (!card.closed))
}

function resolveContent(content, defaultValue, transformer = R.identity) {
    if (!content) {
        return defaultValue
    }

    if (content == true) {
        return true
    }

    if (content.text) {
        return transformer(content.text)
    }

    return defaultValue
}

const standardMode = {
    sectionTag: 'section',
    itemTag: null
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

    let { html, children } = cards.reduce((combined, { name, attachments, desc }) => {
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
            return combined
        }

        if (tags.article) {
            mode = articleMode
            itemAttributes = {}
            const className = resolveContent(tags.class)
            if (className) {
                itemAttributes.class = className
            }
            return combined
        }

        const scaleFactor = resolveContent(tags.scalefactor, 1.0, parseFloat)

        // Attached images
        imagesHTML = R.chain(({ previews }) => {
            if (!previews) { return [] }

            const preview = R.last(previews)
            if (!preview) { return [] }

            return htmlElement('img', { src: preview.url, width: preview.width / scaleFactor, height: preview.height / scaleFactor })
        }, attachments).join('\n')

        let output
        let imagesBefore = false
        let itemTag = mode.itemTag

        if (tags.primary) {
            output = ''
            title = text
        }
        else if (text.length > 0) {
            output = text

            let tagName = 'p'
            let outerTagName
            let classes = []

            const baseClass = resolveContent(tags.class)
            if (baseClass) {
                classes.push(baseClass)
            }

            if (tags.cta) {
                tagName = 'span'
            }
            else {
                tagName = 'h2' // #secondary by default
            }

            if (tags.figure || imagesHTML.length > 0) {
                itemTag = 'figure'
                outerTagName = 'figcaption'
                imagesBefore = true
            }
            else if (tags.secondary) {
                tagName = 'h2'
            }
            else if (tags.tertiary) {
                tagName = 'h3'
            }
            else if (tags.text) {
                tagName = 'p'
            }

            output = htmlElement(tagName, {
                class: classes.join(' ')
            }, output)
        }
        else {
            output = ''
        }

        let descriptionHTML = ''
        if (desc && desc.length > 0) {
            descriptionHTML = renderMarkdown(desc)
        }

        if (imagesBefore) {
            output = imagesHTML + output + descriptionHTML
        }
        else {
            output = output + imagesHTML + descriptionHTML
        }

        if (output.length > 0) {
            if (itemTag) {
                output = htmlElement(itemTag, itemAttributes, output) + '\n'
            }

            const url = resolveContent(tags.link)
            if (url) {
                let classes = []
                if (tags.cta) {
                    classes.push('cta')
                }
                // Change itemTag to 'a' instead?
                output = htmlElement('a', { href: url, class: classes.join(' ') }, output)
            }

            const slug = resolveContent(tags.slug)
            if (slug) {
                //const childHTML = htmlElement(mode.sectionTag, sectionAttributes, output) + '\n'
                combined.children.push({
                    slug,
                    title: text,
                    html: output
                })
            }
        }

        combined.html += output + '\n'

        return combined
    }, { html: '', children: [] })

    if (mode.sectionTag) {
        html = htmlElement(mode.sectionTag, sectionAttributes, html) + '\n'
    }

    return { html, children, title }
}

function renderContentHTML(html, title) {
    if (title != null && title.length > 0) {
        const header = htmlElement('header', {}, htmlElement('h1', {}, title))
        html = `\n${header}\n${html}\n`
    }

    return htmlElement('main', { class: 'content' }, html)
}

function renderContentCards(cards, defaultTitle) {
    let { html, children, title } = htmlForCards(cards, { mode: standardMode, title: defaultTitle })

    html = renderContentHTML(html, title)

    return {
        html,
        children,
        title
    }
}

function renderMetaCards(cards) {
    return cards.map(({ desc }) => {
        return desc
    }).join('\n')
}

function routesForRedirectCards(cards) {
    return cards.reduce((routes, { name }) => {
        const { text, tags } = parseElement(name)
        const fromPath = resolveContent(tags.from)
        const toPath = resolveContent(tags.to)
        if (fromPath && toPath) {
            routes.push({
                method: 'GET',
                path: fromPath,
                handler(request, reply) {
                    reply.redirect(toPath)
                }
            })
        }

        return routes
    }, [])
}

function routesForTrelloData({ lists, cards: allCards }) {
    // Global
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
        const cards = cardsForID(allCards, listID)

        // Redirects
        if (listName === '#redirects') {
            routes.push.apply(routes, routesForRedirectCards(cards))
            return routes
        }

        // Page with path
        const { text: title, tags } = parseElement(listName)
        const path = resolveContent(tags.path)
        if (path == null || path.length === 0) {
            return routes
        }

        const bodyClasses = (resolveContent(tags.class) || '').split(' ')

        const { metaCards, contentCards } = groupCards(cards)

        const { html: contentHTML, children } = renderContentCards(contentCards, title)

        const bodyHTML = globalAboveHTML + contentHTML  
        const metaHTML = renderMetaCards(globalMetaCards.concat(metaCards))
        const html = htmlTemplate({
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

        if (children.length > 0) {
            children.forEach(({ slug, title, html: contentHTML }) => {
                const bodyHTML = renderContentHTML(globalAboveHTML + contentHTML)
                const html = htmlTemplate({
                    title,
                    metaHTML,
                    bodyClasses,
                    bodyHTML
                })

                const childPath = R.unless(
                    R.pipe(
                        R.last,
                        R.equals('/')
                    ),
                    R.concat(R.__, '/')
                )(path) + slug

                routes.push({
                    method: 'GET',
                    path: childPath,
                    handler(request, reply) {
                        reply(html)
                    }
                })
            })
        }

        return routes
    }, [])
}

module.exports = routesForTrelloData
