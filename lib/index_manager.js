var levelCache = require('levelup-cache')
var extend = require('xtend')
var EventEmitter = require('events').EventEmitter

function defaultPostSortingFunction(a, b) {
	var valid = a && b && a.metadata && b.metadata && a.metadata.date && b.metadata.date
	if (!valid || a.metadata.date == b.metadata.date) {
		return 0
	} else if (a.metadata.date < b.metadata.date) {
		return -1
	} else {
		return 1
	}
}

function compareIndexArrays(a, b) {
	return a.length === b.length && a.every(function(element, index) {
		return b[index] === element
	})
}

var KEY = 'index'
var defaultOptions = {
	refreshEvery: 10 * 60 * 1000,
	comparison: compareIndexArrays
}

function PostIndexManager(retrieval, postManager, levelUpDb, options) {
	options = extend(defaultOptions, options)

	var emitter = Object.create(new EventEmitter())

	var cache = levelCache(levelUpDb, function(key, cb) {
		retrieval.getIndex(cb)
	}, options)

	cache.on('change', function(key, contents) {
		emitter.emit('change', contents)
	})

	var get = cache.get.bind(cache, KEY)
	get()

	function getPostsUsingPostGetter(postGetter, begin, end, cb) {
		if (typeof begin === 'function') {
			cb = begin
		}
		if (typeof cb !== 'function') {
			cb = function () {}
		}
		get(function(err, postNames) {
			if (err) {
				cb(err)
			} else {
				postGetter(postNames, function(err, posts) {
					if (!err) {
						posts = posts.sort(options.sortPosts || defaultPostSortingFunction)
						if (typeof begin === 'number') {
							posts = posts.slice(begin, end)
						}
					}
					cb(err, posts)
				})
			}
		})
	}

	var getLocalAndRemotePosts = getPostsUsingPostGetter.bind(null, postManager.getPosts)

	var getLocalPosts = getPostsUsingPostGetter.bind(null, postManager.getLocalPosts)

	emitter.getPosts = function getPosts(options, cb) {
		if (typeof options === 'function') {
			cb = options
		}
		if (typeof options !== 'object') {
			options = {}
		}
		var local = options.local || false
		var begin = typeof options.mostRecent === 'number' ? -options.mostRecent : undefined
		var postGetter = local ? getLocalPosts : getLocalAndRemotePosts
		postGetter(begin, undefined, cb)
	}
	emitter.onChange = getLocalAndRemotePosts
	emitter.allPostsAreLoaded = function(cb) {
		if (typeof cb !== 'function') {
			cb = function () {}
		}
		get(function(err, postNames) {
			if (err) {
				cb(false, false)
			} else {
				getLocalPosts(function(err, posts) {
					cb(err, err || (posts.length === postNames.length))
				})
			}
		})
	}
	emitter.stop = cache.stop

	return emitter
}

module.exports = PostIndexManager
