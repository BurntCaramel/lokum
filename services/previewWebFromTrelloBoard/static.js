const conformPath = require('./conformPath')

function promiseFileContentsForRoutes(routes) {
  const fileContentsPromises = []
  routes.forEach(({ path, handler }) => {
    if (conformPath(path) !== path) {
      return
    }

    fileContentsPromises.push(new Promise((resolve, reject) => {
      handler({}, (result) => {
        if (result instanceof Error) {
          reject(result)
        }
        else {
          Promise.resolve(result)
          .then(html => {
            resolve({
              // Remove leading slash
              [`${ conformPath(path).substring(1) }index.html`]: html
            })
          })
          .catch(reject)
        }
      })
    }))
  })

  return Promise.all(fileContentsPromises)
  .then(objects => Object.assign.apply(Object, [{}].concat(objects)))
}

module.exports = {
  promiseFileContentsForRoutes
}