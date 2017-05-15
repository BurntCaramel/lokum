function conformPath(path) {
	if (path === '/' || path[path.length - 1] === '/') {
		return path
	}
	else {
		return path + '/'
	}
}

module.exports = conformPath