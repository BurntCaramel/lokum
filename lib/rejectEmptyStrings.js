'use strict';

var R = require('ramda');

var rejectEmptyStrings = R.filter(R.test(/\S/));

module.exports = rejectEmptyStrings;