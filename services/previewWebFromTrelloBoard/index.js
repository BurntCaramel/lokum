const Axios = require('axios')
const Archiver = require('archiver')
const { promiseEnhancedTrelloCards, routesForTrelloData } = require('lokum/lib/trello')

function conformPath(path) {
	if (path === '/' || path[path.length - 1] === '/') {
		return path
	}
	else {
		return path + '/'
	}
}

exports.previewWebFromTrelloBoard = function previewWebFromTrelloBoard(req, res) {
	const [ _empty, boardInput, ...pathComponents ] = req.path.split('/')

	console.log('path', boardInput, pathComponents)

	let [ boardID, type ] = boardInput.split('.')

	const isZip = (type === 'zip')

	if (!boardID || boardID.length === 0) {
		res.status(400).send('Pass a trello board ID: /:trelloBoardID/subpath')
		return
	}

	Axios.get(`https://trello.com/b/${ boardID }.json`)
	.then(({ data: boardJSON }) => {
		console.log('Loaded content from Trello', boardID)

		return promiseEnhancedTrelloCards(boardJSON.cards)
		.then((cards) => {
			console.log('Enhanced cards')

			const enhancedBoardJSON = Object.assign({}, boardJSON, { cards })

			const routes = routesForTrelloData(enhancedBoardJSON)
			const pathToFind = conformPath('/' + pathComponents.join('/'))

			if (isZip) {
				const archive = Archiver('zip', {
					zlib: { level: 9 } // Sets the compression level.
				})

				archive.on('error', (err) => {
					res.status(500).send(html)
				})

				res.type('zip')
				archive.pipe(res)

				routes.forEach(({ path, handler }) => {
					if (conformPath(path) !== path) {
						return
					}

					handler({}, (html) => {
						archive.append(html, {
							name: `${ conformPath(path).substring(1) }index.html`
						})
					})
				})

				archive.finalize()
			}
			else {
				const matchingRoute = routes.find(({ path }) => (
					conformPath(path) === pathToFind
				))

				if (!matchingRoute) {
					res.status(404).send(`Not found: ${path}`)
					return
				}

				matchingRoute.handler({}, (html) => {
					res.status(200).send(html)
				})
			}
		})
	})
	.catch(error => {
		res.status(501).send({ error })
	})
};

