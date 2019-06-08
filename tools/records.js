var tools = require('./tools.js')
var config = require('../config.json')
var request = require('request')
var express = require('express')
var router = express.Router()
var R = require('ramda')

var helpers = require('./api_call_helpers')
var headers = require('./headers')

const queryAndDelete = ({ req, res }, query, type, syncToken) => {
  var token = helpers.authorize(req, res)

  // Set up API call (with OAuth2 accessToken)
  const selectStatement = encodeURIComponent(query)
  const queryUrl = config.api_uri + req.session.realmId + '/query?query=' + selectStatement
  const deleteUrl = config.api_uri + req.session.realmId + `/${type.toLowerCase()}?operation=delete`
  const pluckRecords = R.path(['QueryResponse', type])
  const getRequestObj = headers.getRequest(queryUrl, token)
  
  console.log('Making API call to: ' + queryUrl)

  request(getRequestObj, (err, response) => {
    // Check if 401 response was returned - refresh tokens if so!
    tools.checkForUnauthorized(req, getRequestObj, err, response)
      .then(function ({err, response}) {
        helpers.checkFailedStatus(err, response, res, function(err, response, res){

          var records = pluckRecords(JSON.parse(response.body))
          
          if(R.is(Array, records) && records.length) {
  
            records.map(record => {
              var deleteRequestObj = headers.deleteRequest(deleteUrl, token)

              deleteRequestObj['body'] = JSON.stringify({
                'SyncToken': syncToken,
                'Id': record.Id
              })
    
              // Make API call
              console.log('Making API call to: ' + deleteUrl)
              request(deleteRequestObj, function (err, response) {
                // Check if 401 response was returned - refresh tokens if so!
                tools.checkForUnauthorized(req, deleteRequestObj, err, response)
                  .then(function ({err, response}) {
                    helpers.checkFailedStatus(err, response, res, function(err, response, res){
                      
                      // API Call was a success!
                      res.json(JSON.parse(response.body))
                    })
            
                  }, function (err) {
                    console.log(err)
                    return res.json(err)
                  })
              })
            })
          } else {
            res.json({
              err: `No ${type}s Exist.`
            })
          }
        })
      }, function(err){
        console.log(err)
        return res.json(err)
      })
  })
}

module.exports = {
  queryAndDelete,
}