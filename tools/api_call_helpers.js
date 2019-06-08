var tools = require('./tools.js')

const authorize = (req, res) => {
  var token = tools.getToken(req.session)
  if(!token) return res.json({error: 'Not authorized'})
  if(!req.session.realmId) return res.json({
    error: 'No realm ID.  QBO calls only work if the accounting scope was passed!'
  })

  return token
}

const checkFailedStatus = (err, response, res, callback) => {
  if(err || response.statusCode != 200) {
    return res.json({error: err, statusCode: response.statusCode})
  } else {
    callback(err, response, res)
  }
}


module.exports = {
  authorize,
  checkFailedStatus,
}