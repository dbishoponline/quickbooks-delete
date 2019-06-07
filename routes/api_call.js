var tools = require('../tools/tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
var R = require('ramda')

const authorize = (req, res) => {
  var token = tools.getToken(req.session)
  if(!token) return res.json({error: 'Not authorized'})
  if(!req.session.realmId) return res.json({
    error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
  })

  return token
}

const checkError = (err, response, res) => {
  if(err || response.statusCode != 200) {
    return res.json({error: err, statusCode: response.statusCode})
  }
}

const getRequest = (url, token) =>
({
  url: url,
  headers: {
    'Authorization': 'Bearer ' + token.accessToken,
    'Accept': 'application/json'
  }
})

const deleteRequest = (url, token) =>
({
  url: url,
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token.accessToken,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
})

/** /api_call **/
router.get('/', function (req, res) {
  var token = authorize(req, res)

  // Set up API call (with OAuth2 accessToken)
  var url = config.api_uri + req.session.realmId + '/companyinfo/' + req.session.realmId
  var requestObj = getRequest(url, token)
  console.log('Making API call to: ' + url)

  // Make API call
  request(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, requestObj, err, response).then(function ({err, response}) {
      checkError(err, response, res)

      // API Call was a success!
      res.json(JSON.parse(response.body))
    }, function (err) {
      console.log(err)
      return res.json(err)
    })
  })
})

/** /api_call/revoke **/
router.get('/revoke', function (req, res) {
  var token = tools.getToken(req.session)
  if(!token) return res.json({error: 'Not authorized'})

  var url = tools.revoke_uri
  request({
    url: url,
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + tools.basicAuth,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'token': token.accessToken
    })
  }, function (err, response, body) {
    if(err || response.statusCode != 200) {
      return res.json({error: err, statusCode: response.statusCode})
    }
    tools.clearToken(req.session)
    res.json({response: "Revoke successful"})
  })
})

/** /api_call/refresh **/
// Note: typical use case would be to refresh the tokens internally (not an API call)
// We recommend refreshing upon receiving a 401 Unauthorized response from Intuit.
// A working example of this can be seen above: `/api_call`
router.get('/refresh', function (req, res) {
  var token = tools.getToken(req.session)
  if(!token) return res.json({error: 'Not authorized'})

  tools.refreshTokens(req.session).then(function(newToken) {
    // We have new tokens!
    res.json({
      accessToken: newToken.accessToken,
      refreshToken: newToken.refreshToken
    })
  }, function(err) {
    // Did we try to call refresh on an old token?
    console.log(err)
    res.json(err)
  })
})

/** /api_call **/
router.get('/get_all_transactions', function (req, res) {
  var token = authorize(req, res)

  // Set up API call (with OAuth2 accessToken)
  var selectStatement = encodeURIComponent(`select * from Purchase where TotalAmt < '100.00'`)
  var url = config.api_uri + req.session.realmId + '/query?query=' + selectStatement
  console.log('Making API call to: ' + url)
  var requestObj = getRequest(url, token)
  // Make API call
  request(requestObj, function (err, response) {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, requestObj, err, response)
      .then(function ({err, response}) {
        checkError(err, response, res)

        // API Call was a success!
        res.json(JSON.parse(response.body))
      }, function (err) {
        console.log(err)
        return res.json(err)
      })
  })
})

router.post('/delete_all_transactions', function (req, res) {
  var token = authorize(req, res)

  // Set up API call (with OAuth2 accessToken)
  var selectStatement = encodeURIComponent(`select * from Purchase`)
  var queryUrl = config.api_uri + req.session.realmId + '/query?query=' + selectStatement
  var deleteUrl = config.api_uri + req.session.realmId + '/purchase?operation=delete'

  var getRequestObj = getRequest(queryUrl, token)
  
  console.log('Making API call to: ' + queryUrl)
  request(getRequestObj, (err, response) => {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, getRequestObj, err, response)
      .then(function ({err, response}) {
        checkError(err, response, res)
        
        var pluckTransactions = R.path(['QueryResponse', 'Purchase'])
        var transactions = pluckTransactions(JSON.parse(response.body))
        
        if(R.is(Array, transactions) && transactions.length) {

          transactions.map(transaction => {
            let deleteRequestObj = deleteRequest(deleteUrl, token)
            deleteRequestObj['body'] = JSON.stringify({
              'SyncToken': '2',
              'Id': transaction.Id
            })
  
            // Make API call
            console.log('Making API call to: ' + deleteUrl)
            request(deleteRequestObj, function (err, response) {
              // Check if 401 response was returned - refresh tokens if so!
              tools.checkForUnauthorized(req, deleteRequestObj, err, response)
                .then(function ({err, response}) {
                  checkError(err, response, res)
          
                  // API Call was a success!
                  res.json(JSON.parse(response.body))
                }, function (err) {
                  console.log(err)
                  return res.json(err)
                })
            })
          })
        } else {
          res.json({
            err: 'No Transactions Exist.'
          })
        }

      }, function(err){
        console.log(err)
        return res.json(err)
      })
  })
})

module.exports = router
