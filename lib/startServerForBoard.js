'use strict';

var Hapi = require('hapi');
var Axios = require('axios');
var R = require('ramda');

var _require = require('./trello'),
    routesForTrelloData = _require.routesForTrelloData,
    promiseEnhancedTrelloCards = _require.promiseEnhancedTrelloCards;

function startServerForBoard(boardID) {
    var server = new Hapi.Server();
    server.connection({
        address: process.env.HOST,
        port: process.env.PORT || 80
    });

    Axios.get('https://trello.com/b/' + boardID + '.json').then(function (response) {
        console.log('Loaded from Trello');
        var boardJSON = response.data;

        server.route({
            method: 'GET',
            path: '/-raw',
            handler: function handler(request, reply) {
                reply(JSON.stringify(boardJSON, null, 2));
            }
        });

        promiseEnhancedTrelloCards(boardJSON.cards).then(function (cards) {
            console.log('Enhanced cards');

            var enhancedBoardJSON = R.merge(boardJSON, { cards: cards });
            server.route(routesForTrelloData(enhancedBoardJSON));

            server.start();

            // Prevent exit
            process.stdin.resume();

            console.log('Started server');
        });
    }).catch(function (error) {
        console.error(error);
    });
}

module.exports = startServerForBoard;