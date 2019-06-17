var request = require('request-promise-native')
var express = require('express')
var R = require('ramda')

var QuickBooks = require('node-quickbooks')

var config = require('../config.json')
var headers = require('./headers')
var tools = require('./tools')

const query = ({ req, res }, query) => {
  
  var token = tools.authorize(req, res)
  var url = tools.getQueryEndpoint(config.api_uri, req.session.realmId, query)
  var requestObj = headers.getRequest(url, token)
  
  console.log('Making API call to: ' + url)
  
  // Make API call
  request(requestObj)
    .then(response => tools.checkForUnauthorized(req, requestObj, response))
    .then(({ error, response }) => tools.checkFailedStatus(error, response, res))
    .then(({ response, res }) => res.json(JSON.parse(response.body)))
    .catch(({ error }) => {
      console.log('\n\n', error)
      return res.json(error)
    })
}

const queryAndDelete = ({ req, res }, query, type, syncToken) => {

  var token = tools.authorize(req, res)

  QuickBooks.setOauthVersion("2.0")

  var qbo = new QuickBooks(
    config.clientId,
    config.clientSecret,
    token.accessToken /* oAuth access token */,
    false /* no token secret for oAuth 2.0 */,
    req.session.realmId,
    false /* use a sandbox account */,
    true /* turn debugging on */,
    4 /* minor version */,
    "2.0" /* oauth version */,
    token.refreshToken /* refresh token */
  )

  const queryUrl = tools.getQueryEndpoint(config.api_uri, req.session.realmId, query)
  const deleteUrl = tools.getDeleteEndpoint(config.api_uri, req.session.realmId, type)
  const pluckRecords = R.path(['QueryResponse', type])
  const getRequestObj = headers.getRequest(queryUrl, token)
  const buildDeleteBatchRequestsFromRecords = buildDeleteRequests(type, syncToken)
  const sendBatchRequestQuickbooks = sendBatchRequest(qbo)
  console.log('Making API call to: ' + queryUrl)

  request(getRequestObj)
    .then(response => tools.checkForUnauthorized(req, getRequestObj, response))
    .then(({ error, response }) => tools.checkFailedStatus(error, response, res))
    .then(({ response }) => pluckRecords(JSON.parse(response.body)))
    .then(verifyRecordsExist)
    .then(buildDeleteBatchRequestsFromRecords)
    .then(sendBatchRequestQuickbooks)
    .then(response => outputResponse(res, response))
    .catch(({ error }) => {
      console.log('\n\n', error)
      return res.json(error)
    })
}

const verifyRecordsExist = records => {
  if(config.debug) console.log(`verifyRecordsExist()`)

  return new Promise((resolve, reject) =>
    R.is(Array, records) && records.length
      ? resolve(records)
      : reject({
        error: `No Records Exist.`
      }))
}

const buildDeleteRequests = R.curry((type, syncToken, records) => {
  if(config.debug) console.log(`buildDeleteRequests()`)

  return records.map((record, i) => ({
    bId: `bid${i}`,
    operation: "delete",
    [type]: {
      SyncToken: `${syncToken}`,
      Id: record.Id,
      AccountRef: {
        value: `${record.AccountRef.value}`,
        name: `${record.AccountRef.name}`
      },
    }
  }))
})

const sendBatchRequest = R.curry((qbo, requests) => {
  if(config.debug) console.log(`sendBatchRequest()`)

  return new Promise((resolve, reject) => {
    qbo.batch(requests.splice(0, 30), (err, responses) => {
      if (err) reject(err)
      else resolve(responses)
    })
  })
})

// const buildDeleteRequests = R.curry((token, deleteUrl, syncToken, records) => {
//   if(config.debug) console.log(`buildDeleteRequests()`, token, deleteUrl, syncToken)
  
//   return records.map(record =>
//     headers.deleteRequest(
//       deleteUrl, 
//       token, 
//       JSON.stringify({
//         'SyncToken': syncToken,
//         'Id': record.Id
//       })))
// })

// const runDeleteRequests = (requests, req, res) => {
//   if(config.debug) console.log(`runDeleteRequests()`)
  
//   // TODO: remove to make all requests
//   requests = [requests.pop()]
  
//   return Promise.all(requests.map(requestObj => {
//     console.log('Making API call to: ' + requestObj.url, requestObj)

//     // return request(requestObj)
//     //   .then(response => tools.checkForUnauthorized(req, requestObj, response))
//     //   .then(({ error, response }) => tools.checkFailedStatus(error, response, res))
//     //   .then(({ response }) => JSON.parse(response.body))
//     //   .catch(({ error }) => {
//     //     console.log('\n\n', error)
//     //     return res.json(error)
//     //   })
//   }))
// }

const outputResponse = (res, response) => {
  if(config.debug) console.log(`outputResponse()`, response)
  return res.json(requests)
}

module.exports = {
  query,
  queryAndDelete,
}