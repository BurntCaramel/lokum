const Hapi = require('hapi')
const Axios = require('axios')

const boardID = 'mQ6WXDAQ'


const server = new Hapi.Server()
server.connection({
	address: process.env.HOST,
	port: (process.env.PORT || 80)
})


let state = {
}

function routesForTrelloData({ lists, cards: allCards }) {
    return lists.reduce((routes, { name: listName, id: listID }) => {
        const [ title, path ] = listName.split('#path:').map(s => s.trim())
        if (path == null || path.length === 0) {
            return routes
        }

        const cards = allCards.filter((card) => (card.idList === listID)) 
        const content = contentForTrelloCards(cards)

        routes.push({
            method: 'GET',
            path,
            handler(request, reply) {
                reply(content)
            }
        })

        return routes
    }, [])
}

function contentForTrelloCards(cards) {
    return cards.map(({ name, attachments }) => {
        return name
    }).join('\n')
}

Axios.get(`https://trello.com/b/${ boardID }.json`)
.then(response => {
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

    console.log('Started server')
})
