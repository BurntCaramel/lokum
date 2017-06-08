const Axios = require('axios')
const Archiver = require('archiver')
const { promiseEnhancedTrelloCards, routesForTrelloData } = require('lokum/lib/trello')
const conformPath = require('lokum/lib/conformPath')
const static = require('lokum/lib/static')
const next = require('lokum/lib/next')

exports.serveWebFromTrelloBoard = function serveWebFromTrelloBoard(req, res) {
	const [ _empty, boardInput, ...pathComponents ] = req.path.split('/')

	console.log('path', boardInput, pathComponents)

	let [ boardID, ...extra ] = boardInput.split('.')

	const isZip = (extra.pop() === 'zip')
	const isNextJS = isZip && (extra.shift() === 'next')

	if (!boardID || boardID.length === 0) {
		res.status(400).send('Pass a Trello board ID: /:trelloBoardID/subpath')
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

				archive.on('error', (error) => {
					res.status(500).send({ error })
				})

				let fileContentsPromise = null

				if (isNextJS) {
					fileContentsPromise = next.promiseFileContentsForRoutes(routes)
				}
				else if (extra.length === 0) {
					fileContentsPromise = static.promiseFileContentsForRoutes(routes)
				}

				if (fileContentsPromise) {
					res.type('zip')
					archive.pipe(res)

					return fileContentsPromise.then(fileContents => {
						Object.keys(fileContents).forEach(filePath => {
							archive.append(fileContents[filePath], {
								name: filePath
							})
						})

						archive.finalize()
					})
				}
				else {
					res.status(404).send({ boardID, options: extra })
				}
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

