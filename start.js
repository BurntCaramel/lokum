// Requires env: TRELLO_BOARD_ID
// Optional env: RELOAD_SECRET

const startServerForBoard = require('./src/startServerForBoard')

const boardID = process.env.TRELLO_BOARD_ID

if (!boardID || boardID.length === 0) {
    throw "No board ID specified: env var TRELLO_BOARD_ID"
}

startServerForBoard(boardID, { reloadSecret: process.env.RELOAD_SECRET })
