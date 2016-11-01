// Requires env: TRELLO_BOARD_ID

const startServerForBoard = require('./src/startServerForBoard')

const boardID = process.env.TRELLO_BOARD_ID

startServerForBoard(boardID)
