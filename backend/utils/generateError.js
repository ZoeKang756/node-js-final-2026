const STATUS_CODE = {
    PERMISSION_DENIED :401,    
}

const STATUS_MSG = {
    PERMISSION_EXPIRED:'Token 已過期',
    PERMISSION_INVALID:'無效的 token',
    PERMISSION_MISSING: '請先登入',
    FORBIDDEN_IS_NOT_COACH: '使用者尚未成為教練',
    FORBIDDEN_IS_NOT_ADMIN: '使用者不是管理員'
}

const init = (status, message)=> {
    const error = new Error(message)
    error.status = status
    return error
  }

module.exports = {
    STATUS_CODE, STATUS_MSG, init
}