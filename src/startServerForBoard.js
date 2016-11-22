const Hapi = require('hapi')
const Axios = require('axios')
const R = require('ramda')

const { routesForTrelloData, promiseEnhancedTrelloCards } = require('./trello')

function startServerForBoard(boardID, { seo = true } = {}) {
    const server = new Hapi.Server()
    server.connection({
        address: process.env.HOST,
        port: (process.env.PORT || 80)
    })

    server.route({
        method: 'GET',
        path: '/-raw',
        handler(request, reply) {
            reply(JSON.stringify(boardJSON, null, 2))
        }
    })

    if (seo) {
        server.route({
            method: 'GET',
            path: '/robots.txt',
            handler(request, reply) {
                reply(
`User-agent: *
Disallow:
`

// Sitemap: https://burntcaramel.github.io/sitemap.xml
                ).type('text/plain')
            }
        })

        // TODO: sitemap
    }

    let reloadableServer

    function reloadFromTrello() {
        return Axios.get(`https://trello.com/b/${ boardID }.json`)
        .then(({ data: boardJSON }) => {
            console.log('Loaded from Trello', boardID)

            return promiseEnhancedTrelloCards(boardJSON.cards)
            .then((cards) => {
                console.log('Enhanced cards')

                const enhancedBoardJSON = R.merge(boardJSON, { cards })

                reloadableServer = new Hapi.Server()
                const reloadableConnection = reloadableServer.connection({ autoListen: false })
                reloadableServer.route(routesForTrelloData(enhancedBoardJSON))

                return { success: true }
            })
        })
    }

    server.route({
        method: 'GET',
        path: '/-reload/{token}',
        handler(request, reply) {
            reloadFromTrello()
            .then(
                reply,
                reply
            )
        }
    })

    server.route({
        method: '*',
        path: '/{p*}',
        handler(request, reply) {
            console.log(request.url, request.params)
            reloadableServer.inject(request.url.href)
            .then((innerResponse) => {
                console.log(innerResponse)
                const outerResponse = reply(innerResponse.rawPayload)
                outerResponse.code(innerResponse.statusCode)
                Object.keys(innerResponse.headers).map((key) => {
                    outerResponse.header(key, innerResponse.headers[key])
                })
            })
        }
    })

    reloadFromTrello()
    .then(
        () => {
            server.start()
        },
        (error) => {
            console.error('Error loading from Trello', error)
        }
    )
    
    // Prevent exit
    process.stdin.resume()

    console.log('Started server')
}

module.exports = startServerForBoard
