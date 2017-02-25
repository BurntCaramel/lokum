import test from 'ava'
import startServerForBoard from './startServerForBoard'

test('Load board from Trello and create server', async t => {
  const {
    internal: {
      boardJSON,
      enhancedBoardJSON,
      server,
      reloadableServer
    }
  } = await startServerForBoard('mQ6WXDAQ', { seo: true })

  t.is(typeof {}, typeof boardJSON)
  t.truthy(boardJSON.cards)
  t.truthy(boardJSON.lists)
  t.is(typeof {}, typeof enhancedBoardJSON)
  t.truthy(enhancedBoardJSON.cards)
  t.truthy(enhancedBoardJSON.lists)

  t.truthy(server)
  t.truthy(reloadableServer)

  t.truthy(reloadableServer.match('GET', '/'))

  const robotsTxtResponse = await server.inject({ method: 'GET', url: '/robots.txt' })
  t.truthy(robotsTxtResponse)
  t.is(robotsTxtResponse.statusCode, 200)
  t.true(robotsTxtResponse.payload.length > 0)
  t.regex(robotsTxtResponse.payload, /User-agent: \*/)

  await server.stop()
  await reloadableServer.stop()
})