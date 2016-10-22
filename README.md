![Lokum logo](docs/lokum-128.png)

# lokum

Host a website from JSON API. e.g. Trello

## Example

```
const { startServerForBoard } = require('lokum')

const boardID = 'mQ6WXDAQ' // From public Trello board https://trello.com/b/mQ6WXDAQ/burntcaramel-com

// Will start a web server on port 80 (or env.PORT)
startServerForBoard(boardID)
```
