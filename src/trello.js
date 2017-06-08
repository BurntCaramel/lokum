const R = require('ramda')
const { resolve, all } = require('creed')
const { infoForVideoWithURL } = require('silverscreen')

const parseElement = require('./parseElement')
const renderMarkdown = require('./renderMarkdown')
const htmlElement = require('./htmlElement')
const createRoutesForHTML = require('./createRoutesForHTML')
const promiseEmbedInfoForURL = require('./promiseEmbedInfoForURL')

const itemNameRegex = R.pipe(
    R.test,
    R.propSatisfies(R.__, 'name')
)
const isPageList = itemNameRegex(/\B#path:/)
const isHomePageList = itemNameRegex(/\B#path:\s*\/\B/)

const itemHasName = R.propEq('name')
const isStrictMetaCard = itemHasName('#meta')
const isCSSCard = itemNameRegex(/\B#css:/)
const isLanguageCard = itemNameRegex(/\B#language:/)
const isAboveContentCard = itemHasName('#above')
const isBelowContentCard = itemHasName('#below')

const groupCards = R.pipe(
    R.groupBy(R.cond([
        [ R.anyPass([isStrictMetaCard, isCSSCard]), R.always('metaCards') ],
        [ isAboveContentCard, R.always('aboveCards') ],
        [ isBelowContentCard, R.always('belowCards') ],
        [ isLanguageCard, R.always('languageCards') ],
        [ R.T, R.always('contentCards') ]
    ])),
    R.merge({
        metaCards: [],
        aboveCards: [],
        belowCards: [],
        languageCards: [],
        contentCards: []
    })
)

function cardsForID(listID, allCards) {
    return allCards.filter((card) => (card.idList === listID) && (!card.closed))
}

const filterDownloadAttachments = R.filter(R.allPass([
    R.propEq('isUpload', true),
    R.propSatisfies(R.isEmpty, 'previews'),
]))

const filterLinkAttachmentsURLs = R.pipe(
    R.filter(
        R.propEq('isUpload', false)
    ),
    R.pluck('url')
)

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
    sectionTag: 'article',
    itemTag: null
}

const articlesMode = {
    sectionTag: 'section',
    itemTag: 'article'
}

const navMode = {
    sectionTag: 'nav',
    itemTag: null
}

function renderCards(cards, { mode = {}, path = '/', title } = {}) {
    let sectionAttributes = {}
    let itemAttributes = {}

    let { html, children } = cards.reduce((combined, { name, attachments, desc, linkURL, videoInfo, embedInfo }) => {
        // TODO: use element: { text, tags }
        const { text, tags } = parseElement(name)

        const draft = resolveContent(tags.draft, false)
        // Skip drafts
        if (draft) {
            return combined
        }

        // #nav
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
        // #article
        else if (tags.article) {
            mode = articlesMode
            itemAttributes = {}
            const className = resolveContent(tags.class)
            if (className) {
                itemAttributes.class = className
            }
            return combined
        }

        let imagesBefore = false
        let itemTag = mode.itemTag

        // Slug and child path
        const slug = resolveContent(tags.slug)
        let childPath
        if (slug) {
            // Combine path with slug
            childPath = R.pipe(
                R.concat(R.__, '/'),
                R.concat(R.__, slug),
                R.replace('//', '/')
            )(path)

            if (!itemTag) {
                itemTag = 'article'
            }
        }

        // Image scale factor
        const scaleFactor = resolveContent(tags.scalefactor, 1.0, parseFloat)
        // Attached images
        const imagesHTML = R.chain(({ previews }) => {
            if (!previews) { return [] }

            const preview = R.last(previews)
            if (!preview) { return [] }

            return htmlElement('img', { src: preview.url, width: preview.width / scaleFactor, height: preview.height / scaleFactor })
        }, attachments).join('\n')

        let output

        if (tags.primary) {
            output = ''
            title = text
        }
        else if (text.length > 0) {
            output = text

            let tagName = 'h2' // #secondary by default
            let outerTagName
            let classes = []

            const baseClass = resolveContent(tags.class)
            if (baseClass) {
                classes.push(baseClass)
            }

            if (tags.figure) {
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
            // TODO: remove
            else if (tags.text) {
                tagName = 'p'
            }

            if (childPath) {
                output = htmlElement('a', {
                    href: childPath
                }, output)
            }

            output = htmlElement(tagName, {
                class: classes.join(' ')
            }, output)
        }
        else {
            output = ''
        }

        if (videoInfo) {
            // Add embedded video
            output += videoInfo.desktopSize.embedCode 
        }
        else if (embedInfo) {
            output += htmlElement('iframe', {
                src: embedInfo.url,
                width: embedInfo.width || 300,
                height: embedInfo.height || 200,
                frameborder: 0
            })
        }

        let descriptionHTML = ''
        if (desc && desc.length > 0) {
            if (tags.html) {
                // Raw unsafe HTML
                descriptionHTML = desc
            }
            else {
                // Render Markdown
                descriptionHTML = renderMarkdown(desc)
            }
        }

        // Add images
        if (imagesBefore) {
            output = imagesHTML + output + descriptionHTML
        }
        else {
            output = output + imagesHTML + descriptionHTML
        }

        // Attachment links
        const downloadAttachments = filterDownloadAttachments(attachments)
        if (downloadAttachments.length > 0) {
            output += renderDownloadAttachmentList(downloadAttachments)
        }

        if (output.length > 0) {
            if (itemTag) {
                output = htmlElement(itemTag, itemAttributes, output) + '\n'
            }

            //const linkURL = resolveContent(tags.link)
            if (linkURL) {
                let classes = []
                if (tags.cta) {
                    classes.push('cta')
                }
                // Change itemTag to 'a' instead?
                output = htmlElement('a', { href: linkURL, class: classes.join(' ') }, output)
            }

            if (slug) {
                combined.children.push({
                    slug,
                    path: childPath,
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

function renderContentHTML(html, title, { mainTag = 'main', mainClass = 'content' } = {}) {
    if (title != null && title.length > 0) {
        const header = htmlElement('header', {}, htmlElement('h1', {}, title))
        html = `\n${header}\n${html}\n`
    }

    return htmlElement(mainTag, { class: mainClass }, html)
}

function renderContentCards(cards, { defaultTitle, path }) {
    let { html, children, title } = renderCards(cards, { mode: standardMode, title: defaultTitle, path })

    html = renderContentHTML(html, title)

    return {
        html,
        children,
        title
    }
}

function renderMetaCards(cards) {
    return cards.map(card => {
        if (isStrictMetaCard(card)) {
            // Raw HTML
            return card.desc
        }
        else {
            // Convenience via tags
            const { text, tags } = card.element || parseElement(card.name)
            if (tags.css) {
                const cssURL = resolveContent(tags.css)
                if (R.is(String, cssURL) && cssURL.length > 0) {
                    return htmlElement('link', { rel: 'stylesheet', href: cssURL })
                }
                else if (card.desc.length > 0) {
                    return htmlElement('style', {}, card.desc)
                }
                else {
                    return ''
                }
            }
            else {
                return `<!-- Unknown '${card.name}' -->`
            }
        }
    }).join('\n')
}

const renderDownloadAttachmentList = R.pipe(
    R.map(R.pipe(
        renderDownloadAttachmentLink,
        (html) => htmlElement('li', {}, html)
    )),
    R.join("\n"),
    (html) => htmlElement('ul', {}, html)
)

function renderDownloadAttachmentLink({ name, url }) {
    return htmlElement('a', { href: url }, name)
}

function renderSiteNavigation({ pageLists }) {
    return htmlElement('nav', {}, pageLists.map(list => {
        const name = list.name
        const { text, tags } = parseElement(name)
        return htmlElement('h2', {}, htmlElement('a', {
            href: resolveContent(tags.path)
        }, text))
    }).join("\n"))
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

const promiseEnhancedCards = R.pipe(
    R.map((card) => {
        const { text, tags } = parseElement(card.name)

        const linkURL = (
            // #link
            resolveContent(tags.link) ||
            // First attached link’s URL
            filterLinkAttachmentsURLs(card.attachments)[0]
        )

        let promises = [
            resolve(card),
            resolve({
                element: { text, tags },
                linkURL
            })
        ]

        const videoURL = resolveContent(tags.video)
        if (videoURL) {
            promises.push(
                infoForVideoWithURL(videoURL, {
                    embedding: {
                        width: 500,
                        aspectRatio: 9 / 16
                    }
                })
                .then(R.objOf('videoInfo'))
            ) 
        }

        const embed = resolveContent(tags.embed, false)
        if (embed && !!linkURL) {
            promises.push(
                promiseEmbedInfoForURL(linkURL)
                .then(R.objOf('embedInfo'))
            ) 
        }

        return all(promises).map(R.mergeAll)
    }),
    all
)

function routesForTrelloData({ name: siteTitle, lists, cards: allCards }) {
    // Ignore archived cards
    lists = lists.filter(list => !list.closed)
    // Lists that have #path
    const pageLists = lists.filter(isPageList)
    // Home
    const hasHomePageList = R.any(isHomePageList, lists)

    // Global
    const globalLists = lists.filter(({ name }) => name === '#all')
    const globalCardsGrouped = R.chain(({ id: listID }) => (
        groupCards(
            cardsForID(listID, allCards)
        )
    ), globalLists)
    // Meta
    const globalMetaCards = R.chain(({ metaCards }) => metaCards, globalCardsGrouped)
    // Above
    const globalAboveCards = R.chain(({ aboveCards }) => aboveCards, globalCardsGrouped)
    const { html: globalAboveHTML } = renderCards(globalAboveCards)
    // Below
    const globalBelowCards = R.chain(({ belowCards }) => belowCards, globalCardsGrouped)
    const { html: globalBelowHTML } = renderCards(globalBelowCards)
    // Nav
    const showBelowNav = !hasHomePageList
    const globalNavHTML = showBelowNav ? renderSiteNavigation({ pageLists }) : ''

    const getCombinedMetaCards = (additionalCards) => {
        let combinedMetaCards = globalMetaCards.concat(additionalCards)
        if (!R.any(isCSSCard, combinedMetaCards)) {
            combinedMetaCards.push({
                name: '#meta',
                desc: require('./default/styleElement')()
            })
        }
        return combinedMetaCards
    }

    let routes =  lists.reduce((routes, { name: listName, id: listID }) => {
        const cards = cardsForID(listID, allCards)

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

        const amp = resolveContent(tags.amp, false, Boolean)

        const bodyClasses = (resolveContent(tags.class) || '').split(' ')

        const { metaCards, contentCards } = groupCards(cards)

        const { html: contentHTML, children } = renderContentCards(contentCards, { defaultTitle: title, path })

        const bodyHTML = globalAboveHTML + contentHTML + globalNavHTML + globalBelowHTML
        const metaHTML = renderMetaCards(getCombinedMetaCards(metaCards))

        routes.push.apply(routes, createRoutesForHTML({
            path,
            htmlOptions: {
                title,
                metaHTML,
                bodyClasses,
                bodyHTML
            },
            amp
        }))

        if (children.length > 0) {
            children.forEach(({ slug, path, title, html: contentHTML }) => {
                const bodyHTML = renderContentHTML(globalAboveHTML + contentHTML + globalNavHTML + globalBelowHTML)

                routes.push.apply(routes, createRoutesForHTML({
                    path,
                    htmlOptions: {
                        title,
                        metaHTML,
                        bodyClasses,
                        bodyHTML
                    },
                    amp
                }))
            })
        }

        return routes
    }, [])

    if (!hasHomePageList) {
        routes.push.apply(routes, createRoutesForHTML({
            path: '/',
            htmlOptions: {
                title: 'Home',
                metaHTML: renderMetaCards(getCombinedMetaCards([])),
                bodyHTML: renderContentHTML(globalNavHTML, siteTitle)
            }
        }))
    }

    return routes
}

module.exports = {
    routesForTrelloData,
    promiseEnhancedTrelloCards: promiseEnhancedCards
}
