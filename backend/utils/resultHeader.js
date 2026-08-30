const resultHeader = function(res, code = 200, status = "success", dataObj = {}) {
  const { message, data, info } = dataObj || {}
  const result = { status }
  if (message !== undefined) result.message = message
  if (data !== undefined) result.data = data
  if (info !== undefined) result.info = info
  return res.status(code).json(result)
}
module.exports = resultHeader