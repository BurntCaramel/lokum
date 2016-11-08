const htmlTemplate = require('./htmlTemplate')

function createRoutes({ path, htmlOptions, amp = false }) {
    let routes = []

    function htmlHandler(request, reply) {
        reply(
            htmlTemplate(htmlOptions)
        )
    }

    function ampHandler(request, reply) {
        reply(
            htmlTemplate(Object.assign({}, htmlOptions, { amp: true }))
        )
    }

    if (path === '/') {
        routes.push({
            method: 'GET',
            path,
            handler: htmlHandler
        })
    }
    else {
        routes.push({
            method: 'GET',
            path: path + '/',
            handler: htmlHandler
        })
        // Sans-trailing-slash redirects to trailing slash
        routes.push({
            method: 'GET',
            path,
            handler(request, reply) {
                reply.redirect(path + '/')
            }
        })
    }

    if (amp) {
        routes.push({
            method: 'GET',
            path: path + '/amp/',
            handler: ampHandler
        })
    }

    return routes
}

module.exports = createRoutes
