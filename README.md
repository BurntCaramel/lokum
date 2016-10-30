![Lokum logo](docs/lokum-128.png)

# lokum

Host a website from JSON API. e.g. Trello

## Example

```
const { startServerForBoard } = require('lokum')

const boardID = 'mQ6WXDAQ' // From public Trello board https://trello.com/b/mQ6WXDAQ/burntcaramel-com

// Will start a web server on port 80 (or specify env.PORT)
startServerForBoard(boardID)
```

## Instructions for creating a website board in Trello

Lokum uses the icing format of hashtagging text. Any trailing **#hashtags** are added as booleans, and any trailing **#hashtag: any text you like** become key-value pairs.

### Create a board in Trello, and make it public.

### Add a list for each page
- The list’s name will become the page’s title
- The **#path** tag pair lets you specify the absolute path for this page.
- The **#class** tag pair lets you specify custom classes for this page.

### Add cards to each page list for the content on the page
- A card’s title becomes an `<h2>`.
- The card’s description is parsed as markdown, and follows the `<h2>`.
- Attached images become `<img>` above the content

#### Links
- Use the **#link** tag pair to make the subheading link out to a URL.

#### Main heading
- Add **#primary** to the subheading you want to make a `<h1>` instead of an `<h2>`. Similarly **#tertiary** can be used for `<h3>`.

#### Posts
- Use the **#slug** tag pair to specify a child-page. The content stays part of the parent page, but also appears solely as a page at its slug’s path. The `<h2>` then links out to the child-page.

#### Navigation
- Add a card with name **#nav** to specify that the cards following should be together wrapped in a `<nav>`.

#### Article
- Add a card with name **#article** to specify that the cards following should be each wrapped in an `<article>`.

#### Metatags, CSS, etc
- Add a card with name **#meta** to add `<meta>` and `<link>` tags from the card’s description as HTML to the `<head>`. 

### Other lists can also be added for additional behaviour

#### Share on all pages
- A list named **#all** will have its cards used across all pages, e.g. shared meta tags.
- Use a card named **#above** for HTML that will be added above every page.

### Path redirects
- A list with name **#redirects**
- Each card must have **#from** and **#to** tag pairs for the original _(from)_ path and destination _(to)_ path for a redirect.
