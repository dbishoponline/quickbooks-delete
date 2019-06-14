const getRequest = (url, token) =>
({
  url: url,
  headers: {
    'Authorization': 'Bearer ' + token.accessToken,
    'Accept': 'application/json'
  },
  resolveWithFullResponse: true,
})

const deleteRequest = (url, token, body) =>
({
  url: url,
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token.accessToken,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body,
  resolveWithFullResponse: true,
})

module.exports = {
  getRequest,
  deleteRequest,
}