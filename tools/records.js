var request = require('request-promise-native')
var express = require('express')
var R = require('ramda')

var config = require('../config.json')
var headers = require('./headers')
var tools = require('./tools')

const query = ({ req, res }, query) => {
  
  var token = tools.authorize(req, res)
  var selectStatement = encodeURIComponent(query)
  var url = tools.getQueryEndpoint(config, req, selectStatement)
  var getRequestObj = headers.getRequest(url, token)
  
  console.log('Making API call to: ' + url)
  
  // Make API call
  return request(getRequestObj)
    .then((err, response) => tools.checkForUnauthorized(req, getRequestObj, err, response))
    .then(({ err, response }) => tools.checkFailedStatus(err, response, res))
    .then(({ response, res }) => res.json(JSON.parse(response.body)))
    .catch(({ error, statusCode }) => {
      console.log(error)
      return res.json(error)
    })
}

const queryAndDelete = ({ req, res }, query, type, syncToken) => {
  
  var token = tools.authorize(req, res)

  // Set up API call (with OAuth2 accessToken)
  const selectStatement = encodeURIComponent(query)
  const queryUrl = tools.getQueryEndpoint(config, req, selectStatement)
  const deleteUrl = tools.getDeleteEndpoint(config, req)
  const pluckRecords = R.path(['QueryResponse', type])
  const getRequestObj = headers.getRequest(queryUrl, token)
  const buildDeleteRequestsFromRecords = buildDeleteRequests(token, deleteUrl, syncToken)
  console.log('Making API call to: ' + queryUrl)

  return request(getRequestObj)
    .then((err, response) => tools.checkForUnauthorized(req, getRequestObj, err, response))
    .then(({ err, response }) => tools.checkFailedStatus(err, response, res))
    .then(( response, res) => pluckRecords(JSON.parse(response.body)))
    .then(verifyItemsExist)
    .then(buildDeleteRequestsFromRecords)
    .then(runDeleteRequests)
    .then(Promise.all)
    .then(outputResponse)
    .catch(({ error, statusCode }) => {
      console.log(error)
      return res.json(error)
    })
}

const verifyItemsExist = records => 
  new Promise((resolve, reject) =>
    R.is(Array, records) && records.length) 
      ? resolve(records)
      : reject({
        records,
        error: `No Records Exist.`
      })

const buildDeleteRequests =
  R.curry((token, deleteUrl, syncToken, records) =>
    records.map(record =>
      headers.deleteRequest(
        deleteUrl, 
        token, 
        JSON.stringify({
          'SyncToken': syncToken,
          'Id': record.Id
        }))))

const runDeleteRequests = requests =>
  requests.map(r => {
    console.log('Making API call to: ' + deleteUrl)
    return request(r)
      .then(({ err, response }) => tools.checkFailedStatus(err, response, res))
      .then(({ response, res }) => JSON.parse(response.body))
  })

const outputResponse = requests =>
  res.json(requests.reduce((acc, r) => `${acc} \n\n ${r}`, ''))

module.exports = {
  query,
  queryAndDelete,
}