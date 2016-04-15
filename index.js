var EventEmitter = require('events').EventEmitter
var sub = require('subleveldown')
var Wizard = require('weak-type-wizard')
var NoddityRetrieval = require('noddity-retrieval')
var extend = require('xtend')

var reflect = require('./lib/reflect.js')
var PostIndexManager = require('./lib/index_manager.js')
var PostManager = require('./lib/post_manager.js')

var postCaster = new Wizard({
	postMetadata: 'metadata',
	string: ['content', 'filename'],
	default: {
		content: '',
		filename: ''
	},
	cast: {
		postMetadata: new Wizard({
			date: 'date',
			markdown: 'boolean'
		})
	}
})

module.exports = function NoddityButler(host, levelUpDb, options) {
	// Host can be either a noddity retrieval object/stub, or a host string to be passed in to one
	var retrieval = typeof host === 'string' ? new NoddityRetrieval(host) : host
	var emitter = new EventEmitter()
	options = extend({
		loadPostsOnIndexChange: true
	}, options)

	var butler = Object.create(emitter)


	var postManager = new PostManager(retrieval, sub(levelUpDb, 'posts', {
		valueEncoding: postCaster.getLevelUpEncoding()
	}), {
		refreshEvery: options.refreshEvery,
		checkToSeeIfItemsNeedToBeRefreshedEvery: options.cacheCheckIntervalMs,
		parallelPostRequests: options.parallelPostRequests
	})

	var indexManager = new PostIndexManager(retrieval, postManager, sub(levelUpDb, 'index', {
		valueEncoding: 'json'
	}), {
		refreshEvery: options.refreshEvery,
		checkToSeeIfItemsNeedToBeRefreshedEvery: options.cacheCheckIntervalMs,
		sortPosts: options.sortPosts
	})

	reflect('change', postManager, emitter, 'post changed')
	reflect('change', indexManager, emitter, 'index changed')

	if (options.loadPostsOnIndexChange) {
		indexManager.on('change', indexManager.onChange)
	}

	function stop() {
		postManager.stop()
		indexManager.stop()
	}

	butler.getPost = postManager.getPost
	butler.getPosts = indexManager.getPosts
	butler.allPostsAreLoaded = indexManager.allPostsAreLoaded
	butler.stop = stop
	butler.refreshPost = postManager.refresh

	return butler
}
