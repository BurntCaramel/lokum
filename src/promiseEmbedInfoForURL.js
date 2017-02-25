const R = require('ramda')
const Axios = require('axios')
const Cheerio = require('cheerio')

// Function-first
function maybeMap(f, a) {
    if (!R.isNil(a)) {
        return f(a)
    }
}

function attrContent(el) {
    return el.attr('content')
}

function promiseEmbedInfoForURL(url) {
    return Axios.get(url)
    .then(({ data }) => {
        const find = Cheerio.load(data)
        const twitterPlayerURL = maybeMap(attrContent, find('meta[name="twitter:player"]'))
        if (twitterPlayerURL) {
            return {
                url: twitterPlayerURL,
                width: maybeMap(attrContent, find('meta[name="twitter:player:width"]')),
                height: maybeMap(attrContent, find('meta[name="twitter:player:height"]'))
            }
        }
    })
}

module.exports = promiseEmbedInfoForURL
