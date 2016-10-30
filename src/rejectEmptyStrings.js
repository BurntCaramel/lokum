const R = require('ramda')

const rejectEmptyStrings = R.filter(R.test(/\S/))

module.exports = rejectEmptyStrings
