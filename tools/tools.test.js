var Tokens = require('csrf')
var ClientOAuth2 = require('client-oauth2')
var request = require('request')
var test = require('ava')

var config = require('../config.json')
var tools = require('./tools')

var csrf = new Tokens()

test('getQueryEndpoint() will return a url string for querying Quickbooks entities', t => {
	t.is(
    tools.getQueryEndpoint(`https://quickbooks.api.intuit.com/v3/company/`, 123391081299374, `select * from Purchase`),
    `https://quickbooks.api.intuit.com/v3/company/123391081299374/query?query=select%20*%20from%20Purchase`
  )
})

test('getDeleteEndpoint() will return a url string for deleting Quickbooks entities', t => {
  t.is(
    tools.getDeleteEndpoint(`https://quickbooks.api.intuit.com/v3/company/`, 123391081299374, 'Purchase'),
    `https://quickbooks.api.intuit.com/v3/company/123391081299374/purchase?operation=delete&minorversion=38`
  )
})

