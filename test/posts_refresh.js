var test = require('tape')
var PostManager = require('../lib/post_manager.js')
var TestRetrieval = require('./retrieval/stub.js')
var levelmem = require('level-mem')

var retrieval = new TestRetrieval()
var db = levelmem('no location', { valueEncoding: require('./retrieval/encoding.js') })

function newPostManager() {
	return new PostManager(retrieval, db, {
		refreshEvery: 500,
		checkToSeeIfItemsNeedToBeRefreshedEvery: 10
	})
}

test("PostManager emits when posts change", function(t) {
	t.plan(8)
	var postManager = newPostManager()

	retrieval.addPost('post1.lol', 'post one', new Date(), 'whatever')

	var post = retrieval.getPostSync('post1.lol')

	postManager.getPost('post1.lol', function(err) {
		t.ifError(err)

		postManager.removeAllListeners()
		postManager.stop()
		postManager = null

		setTimeout(function() {
			post.content = 'updated'

			var postManager2 = newPostManager()

			postManager2.getPost('post1.lol', function (err, post) {
				t.ifError(err)
				t.equal(post.content, 'updated', 'doing a getPost on a new post manager works fine')
			})

			postManager2.once('change', function(key, post1) {
				t.equal(key, 'post1.lol', 'was post1.lol')
				t.equal(post1.metadata.title, 'post one', 'Title was the same as before')
				t.equal(post1.content, 'updated', 'Content was updated')

				postManager2.getPost('post1.lol', function (err, post) {
					t.ifError(err)
					t.equal(post.content, 'updated', 'doing a getPost on a new post manager works fine')
				})
			})

			setTimeout(function () {
				postManager2.stop()
				t.end()
			}, 400)
		}, 520)
	})
})
