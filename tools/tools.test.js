var Tokens = require('csrf')
var ClientOAuth2 = require('client-oauth2')
var request = require('request')
var test = require('ava')

var config = require('../config.json')

var csrf = new Tokens()

test('foo', t => {
	t.fail()
})

test('bar', async t => {
	const bar = Promise.resolve('bar')
	t.is(await bar, 'bar')
})
