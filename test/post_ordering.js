var Butler = require('../')
var test = require('tape')
var createServer = require('./fakeo_remote_server/index.js')
var levelmem = require('level-mem')
var contentIndexJson = require('./fakeo_remote_server/index.json')

var postsInDefaultOrder = [{
	content: 'Two posts, whaaat?',
	metadata: {
		date: new Date('2013-08-01T19:10:29.000Z'),
		title: 'This is ANOTHER post'
	},
	filename: 'another-post.md'
}, {
	content: 'Howdy, and thanks for reading this post!',
	metadata: {
		date: new Date('2013-08-03T17:29:29.000Z'),
		title: 'This is the first post'
	},
	filename: 'post1.md'
}, {
	content: 'Howdy, and thanks for reading this post!',
	metadata: {
		date: new Date('2013-08-04T17:29:29.000Z'),
		title: 'This is the second post'
	},
	filename: 'post2.md'
}, {
	content: 'Howdy, and thanks for reading this post!',
	metadata: {
		date: new Date('2013-08-05T17:29:29.000Z'),
		title: 'This is the third post'
	},
	filename: 'post3.md'
}, {
	content: 'Howdy, and thanks for reading this post!',
	metadata: {
		date: new Date('2013-08-07T17:29:29.000Z'),
		title: 'This is the fifth post'
	},
	filename: 'post5.md'
}, {
	content: 'Howdy, and thanks for reading this post!\r\n\r\nWait, why does this post come after post5.md?',
	metadata: {
		date: new Date('2013-08-08T17:29:29.000Z'),
		title: 'This is the fourth post'
	},
	filename: 'post4.md'
}]

test('with no options, you get the default order', function(t) {
	var server = createServer(8989, 100)
	var butler = new Butler('http://127.0.0.1:8989', levelmem())

	butler.getPosts(function(err, posts) {
		t.ifError(err)
		t.deepEqual(posts, postsInDefaultOrder, 'posts are ordered as the index.json has them')
		
		butler.stop()
		server.close()
		t.end()
	})
})

test('you can sort all the things', function(t) {
	var server = createServer(8989, 100)

	function sortByFilename(a, b) {
		return a.filename > b.filename ? 1 : ( a.filename < b.filename ? -1 : 0 )
	}
	function getFilename(post) {
		return post.filename
	}

	var butler = new Butler('http://127.0.0.1:8989', levelmem(), {
		sortPosts: sortByFilename
	})

	butler.getPosts(function(err, posts) {
		t.ifError(err)
		t.deepEqual(posts.map(getFilename), contentIndexJson.sort(), 'posts are ordered as the index.json has them')
		
		butler.stop()
		server.close()
		t.end()
	})
})
