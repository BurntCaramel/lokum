const conformPath = require('./conformPath')

const packageJSONTemplate = {
  "main": "index.js",
  "dependencies": {
    "next": "^2.3.1",
    "postcss-loader": "^2.0.3",
    "react": "^15.5.4",
    "react-dom": "^15.5.4"
  },
  "scripts": {
    "dev": "next",
    "build": "node_modules/.bin/next build",
    "start": "node_modules/.bin/next start"
  }
}

function pageContent(pageHTML) {
  let [headHTML, innerHTML] = pageHTML.split(/<body[^>]*>/)

  headHTML = headHTML.replace(/[\s\S]*<head>/, '')
  headHTML = headHTML.replace('</head>', '')
  headHTML = headHTML.replace(/<link([^>]+)>/g, '<link$1/>')
  headHTML = headHTML.replace(/<meta([^>]+)>/g, '<meta$1/>')
  headHTML = headHTML.trim()

  //let innerHTML = pageHTML.replace(/[\s\S]*<body[^>]*>/, '')

  innerHTML = innerHTML.replace(/(<\/body>[\s\S]*)$/, '')

  // Add closing /> for JSX, e.g. <img> -> <img />
  innerHTML = innerHTML.replace(/<img([^>]+)>/g, '<img$1/>')
  innerHTML = innerHTML.replace(/<br([^>]+)>/g, '<br$1/>')
  innerHTML = innerHTML.replace(/<hr([^>]+)>/g, '<hr$1/>')
  innerHTML = innerHTML.replace(/<input([^>]+)>/g, '<input$1/>')

  innerHTML = innerHTML.replace(/ class="/g, ' className="')
  //innerHTML = innerHTML.replace('<a>', '<Link><a>')

  return `import Link from 'next/link'
import Head from 'next/head'

export default ({
  url
}) => (
  <div>
    <Head>
      ${ headHTML }
    </Head>
    ${ innerHTML.trim() }
  </div>
)`
}

function promiseFileContentsForRoutes(routes) {
  const fileContentsPromises = [
    Promise.resolve({
      "package.json": JSON.stringify(packageJSONTemplate, null, 2)
    })
  ]

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
              // Place HTML in pages/...PATH/index.js
              [`pages${ conformPath(path) }index.js`]: pageContent(html)
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