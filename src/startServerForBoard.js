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

    Axios.get(`https://trello.com/b/${ boardID }.json`)
    .then(response => {
        console.log('Loaded from Trello')
        const boardJSON = response.data

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

        promiseEnhancedTrelloCards(boardJSON.cards)
        .then((cards) => {
            console.log('Enhanced cards')

            const enhancedBoardJSON = R.merge(boardJSON, { cards })
            server.route(routesForTrelloData(enhancedBoardJSON))
            
            server.start()

            // Prevent exit
            process.stdin.resume()

            console.log('Started server')
        })
    })
    .catch(error => {
        console.error(error)
    })
}

module.exports = startServerForBoard
