// Requires env: TRELLO_BOARD_ID
// Optional env: RELOAD_SECRET

const startServerForBoard = require('./src/startServerForBoard')

const {
    TRELLO_BOARD_ID: boardID,
    RELOAD_SECRET: reloadSecret,
    HOST: host,
    PORT: port = 9000
} = process.env

if (!boardID || boardID.length === 0) {
    throw "No board ID specified: set env TRELLO_BOARD_ID"
}

startServerForBoard(boardID, { reloadSecret, host, port })
