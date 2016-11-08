function createRoutes({ path, html }) {
    if (path === '/') {
        return [
            {
                method: 'GET',
                path,
                handler(request, reply) {
                    reply(html)
                }
            }    
        ]
    }

    return [
        // Trailing slash is preferred
        {
            method: 'GET',
            path: path + '/',
            handler(request, reply) {
                reply(html)
            }
        },
        // Sans-trailing-slash redirects to trailing slash
        {
            method: 'GET',
            path,
            handler(request, reply) {
                reply.redirect(path + '/')
            }
        }
    ]
}

module.exports = createRoutes
