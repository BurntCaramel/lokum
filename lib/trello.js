'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var R = require('ramda');

var _require = require('creed'),
    resolve = _require.resolve,
    all = _require.all;

var _require2 = require('silverscreen'),
    infoForVideoWithURL = _require2.infoForVideoWithURL;

var parseElement = require('./parseElement');
var renderMarkdown = require('./renderMarkdown');
var htmlTemplate = require('./htmlTemplate');
var htmlElement = require('./htmlElement');

function groupCards(cards) {
    var _R$partition = R.partition(function (card) {
        return card.name === '#meta';
    }, cards),
        _R$partition2 = _slicedToArray(_R$partition, 2),
        metaCards = _R$partition2[0],
        notMetaCards = _R$partition2[1];

    var _R$partition3 = R.partition(function (card) {
        return card.name === '#above';
    }, notMetaCards),
        _R$partition4 = _slicedToArray(_R$partition3, 2),
        aboveCards = _R$partition4[0],
        notAboveCards = _R$partition4[1];

    return { metaCards: metaCards, aboveCards: aboveCards, contentCards: notAboveCards };
}

function cardsForID(allCards, listID) {
    return allCards.filter(function (card) {
        return card.idList === listID && !card.closed;
    });
}

function resolveContent(content, defaultValue) {
    var transformer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : R.identity;

    if (!content) {
        return defaultValue;
    }

    if (content == true) {
        return true;
    }

    if (content.text) {
        return transformer(content.text);
    }

    return defaultValue;
}

var standardMode = {
    sectionTag: 'section',
    itemTag: null
};

var articleMode = {
    sectionTag: 'section',
    itemTag: 'article'
};

var navMode = {
    sectionTag: 'nav',
    itemTag: 'div'
};

function htmlForCards(cards) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$mode = _ref.mode,
        mode = _ref$mode === undefined ? {} : _ref$mode,
        _ref$path = _ref.path,
        path = _ref$path === undefined ? '/' : _ref$path,
        title = _ref.title;

    var sectionAttributes = {};
    var itemAttributes = {};

    var _cards$reduce = cards.reduce(function (combined, _ref2) {
        var name = _ref2.name,
            attachments = _ref2.attachments,
            desc = _ref2.desc,
            videoInfo = _ref2.videoInfo;

        // TODO: use element: { text, tags }
        var _parseElement = parseElement(name),
            text = _parseElement.text,
            tags = _parseElement.tags;

        var draft = resolveContent(tags.draft, false);
        if (draft) {
            return combined;
        }

        if (tags.nav) {
            mode = navMode;
            itemAttributes = {};

            var className = resolveContent(tags.class) || '';
            if (tags.primary) {
                className += ' primary';
            }

            className = className.trim();
            if (className.length > 0) {
                sectionAttributes.class = className;
            }
            return combined;
        }

        if (tags.article) {
            mode = articleMode;
            itemAttributes = {};
            var _className = resolveContent(tags.class);
            if (_className) {
                itemAttributes.class = _className;
            }
            return combined;
        }

        var imagesBefore = false;
        var itemTag = mode.itemTag;

        // Slug and child path
        var slug = resolveContent(tags.slug);
        var childPath = void 0;
        if (slug) {
            childPath = R.unless(R.pipe(R.last, R.equals('/')), R.concat(R.__, '/'))(path) + slug;

            if (!itemTag) {
                itemTag = 'article';
            }
        }

        // Image scale factor
        var scaleFactor = resolveContent(tags.scalefactor, 1.0, parseFloat);
        // Attached images
        imagesHTML = R.chain(function (_ref3) {
            var previews = _ref3.previews;

            if (!previews) {
                return [];
            }

            var preview = R.last(previews);
            if (!preview) {
                return [];
            }

            return htmlElement('img', { src: preview.url, width: preview.width / scaleFactor, height: preview.height / scaleFactor });
        }, attachments).join('\n');

        var output = void 0;

        if (tags.primary) {
            output = '';
            title = text;
        } else if (text.length > 0) {
            output = text;

            var tagName = 'p';
            var outerTagName = void 0;
            var classes = [];

            var baseClass = resolveContent(tags.class);
            if (baseClass) {
                classes.push(baseClass);
            }

            if (tags.cta) {
                tagName = 'span';
            } else {
                tagName = 'h2'; // #secondary by default
            }

            if (tags.figure || imagesHTML.length > 0) {
                itemTag = 'figure';
                outerTagName = 'figcaption';
                imagesBefore = true;
            } else if (tags.secondary) {
                tagName = 'h2';
            } else if (tags.tertiary) {
                tagName = 'h3';
            } else if (tags.text) {
                tagName = 'p';
            }

            if (childPath) {
                output = htmlElement('a', {
                    href: childPath
                }, output);
            }

            output = htmlElement(tagName, {
                class: classes.join(' ')
            }, output);
        } else {
            output = '';
        }

        if (videoInfo) {
            // Add embedded video
            output += videoInfo.desktopSize.embedCode;
        }

        var descriptionHTML = '';
        if (desc && desc.length > 0) {
            descriptionHTML = renderMarkdown(desc);
        }

        if (imagesBefore) {
            output = imagesHTML + output + descriptionHTML;
        } else {
            output = output + imagesHTML + descriptionHTML;
        }

        if (output.length > 0) {
            if (itemTag) {
                output = htmlElement(itemTag, itemAttributes, output) + '\n';
            }

            var url = resolveContent(tags.link);
            if (url) {
                var _classes = [];
                if (tags.cta) {
                    _classes.push('cta');
                }
                // Change itemTag to 'a' instead?
                output = htmlElement('a', { href: url, class: _classes.join(' ') }, output);
            }

            if (slug) {
                combined.children.push({
                    slug: slug,
                    path: childPath,
                    title: text,
                    html: output
                });
            }
        }

        combined.html += output + '\n';

        return combined;
    }, { html: '', children: [] }),
        html = _cards$reduce.html,
        children = _cards$reduce.children;

    if (mode.sectionTag) {
        html = htmlElement(mode.sectionTag, sectionAttributes, html) + '\n';
    }

    return { html: html, children: children, title: title };
}

function renderContentHTML(html, title) {
    if (title != null && title.length > 0) {
        var header = htmlElement('header', {}, htmlElement('h1', {}, title));
        html = '\n' + header + '\n' + html + '\n';
    }

    return htmlElement('main', { class: 'content' }, html);
}

function renderContentCards(cards, _ref4) {
    var defaultTitle = _ref4.defaultTitle,
        path = _ref4.path;

    var _htmlForCards = htmlForCards(cards, { mode: standardMode, title: defaultTitle, path: path }),
        html = _htmlForCards.html,
        children = _htmlForCards.children,
        title = _htmlForCards.title;

    html = renderContentHTML(html, title);

    return {
        html: html,
        children: children,
        title: title
    };
}

function renderMetaCards(cards) {
    return cards.map(function (_ref5) {
        var desc = _ref5.desc;

        return desc;
    }).join('\n');
}

function routesForRedirectCards(cards) {
    return cards.reduce(function (routes, _ref6) {
        var name = _ref6.name;

        var _parseElement2 = parseElement(name),
            text = _parseElement2.text,
            tags = _parseElement2.tags;

        var fromPath = resolveContent(tags.from);
        var toPath = resolveContent(tags.to);
        if (fromPath && toPath) {
            routes.push({
                method: 'GET',
                path: fromPath,
                handler: function handler(request, reply) {
                    reply.redirect(toPath);
                }
            });
        }

        return routes;
    }, []);
}

var promiseEnhancedCards = R.pipe(R.map(function (card) {
    var _parseElement3 = parseElement(card.name),
        text = _parseElement3.text,
        tags = _parseElement3.tags;

    var promises = [resolve(card), resolve({
        element: { text: text, tags: tags }
    })];

    var videoURL = resolveContent(tags.video);
    if (videoURL) {
        promises.push(infoForVideoWithURL(videoURL, {
            embedding: {
                width: 500,
                aspectRatio: 9 / 16
            }
        }).then(R.objOf('videoInfo')));
    }

    return all(promises).map(R.mergeAll);
}), all);

function routesForTrelloData(_ref7) {
    var lists = _ref7.lists,
        allCards = _ref7.cards;

    // Global
    var globalLists = lists.filter(function (_ref8) {
        var name = _ref8.name;
        return name === '#all';
    });
    var globalCardsGrouped = R.chain(function (_ref9) {
        var listID = _ref9.id;
        return groupCards(cardsForID(allCards, listID));
    }, globalLists);
    // Meta
    var globalMetaCards = R.chain(function (_ref10) {
        var metaCards = _ref10.metaCards;
        return metaCards;
    }, globalCardsGrouped);
    // Above
    var globalAboveCards = R.chain(function (_ref11) {
        var aboveCards = _ref11.aboveCards;
        return aboveCards;
    }, globalCardsGrouped);

    var _htmlForCards2 = htmlForCards(globalAboveCards),
        globalAboveHTML = _htmlForCards2.html;

    return lists.reduce(function (routes, _ref12) {
        var listName = _ref12.name,
            listID = _ref12.id;

        var cards = cardsForID(allCards, listID);

        // Redirects
        if (listName === '#redirects') {
            routes.push.apply(routes, routesForRedirectCards(cards));
            return routes;
        }

        // Page with path

        var _parseElement4 = parseElement(listName),
            title = _parseElement4.text,
            tags = _parseElement4.tags;

        var path = resolveContent(tags.path);
        if (path == null || path.length === 0) {
            return routes;
        }

        var bodyClasses = (resolveContent(tags.class) || '').split(' ');

        var _groupCards = groupCards(cards),
            metaCards = _groupCards.metaCards,
            contentCards = _groupCards.contentCards;

        var _renderContentCards = renderContentCards(contentCards, { defaultTitle: title, path: path }),
            contentHTML = _renderContentCards.html,
            children = _renderContentCards.children;

        var bodyHTML = globalAboveHTML + contentHTML;
        var metaHTML = renderMetaCards(globalMetaCards.concat(metaCards));
        var html = htmlTemplate({
            title: title,
            metaHTML: metaHTML,
            bodyClasses: bodyClasses,
            bodyHTML: bodyHTML
        });

        routes.push({
            method: 'GET',
            path: path,
            handler: function handler(request, reply) {
                reply(html);
            }
        });

        if (children.length > 0) {
            children.forEach(function (_ref13) {
                var slug = _ref13.slug,
                    path = _ref13.path,
                    title = _ref13.title,
                    contentHTML = _ref13.html;

                var bodyHTML = renderContentHTML(globalAboveHTML + contentHTML);
                var html = htmlTemplate({
                    title: title,
                    metaHTML: metaHTML,
                    bodyClasses: bodyClasses,
                    bodyHTML: bodyHTML
                });

                routes.push({
                    method: 'GET',
                    path: path,
                    handler: function handler(request, reply) {
                        reply(html);
                    }
                });
            });
        }

        return routes;
    }, []);
}

module.exports = {
    routesForTrelloData: routesForTrelloData,
    promiseEnhancedTrelloCards: promiseEnhancedCards
};