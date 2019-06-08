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

module.exports = {
  getRequest,
  deleteRequest,
}