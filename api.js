/**
 * 后端接口封装
 * 与网页端共用同一套 PHP 接口，使用 Bearer Token 鉴权（网页端使用 Cookie）。
 */

import { getBaseUrl } from './config'

const TOKEN_KEY = 'lts_token'
const USER_KEY = 'lts_user'

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function setToken(token) {
  try {
    uni.setStorageSync(TOKEN_KEY, token || '')
  } catch (e) {
    // 忽略存储异常
  }
}

export function clearToken() {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(USER_KEY)
  } catch (e) {
    // 忽略存储异常
  }
}

export function getCachedUser() {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    return raw && typeof raw === 'object' ? raw : null
  } catch (e) {
    return null
  }
}

export function setCachedUser(user) {
  try {
    uni.setStorageSync(USER_KEY, user || null)
  } catch (e) {
    // 忽略存储异常
  }
}

function toQuery(data) {
  if (!data) {
    return ''
  }
  return Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(String(data[key])))
    .join('&')
}

function buildUrl(path, query) {
  let url = getBaseUrl() + path
  const qs = toQuery(query)
  if (qs) {
    url += (url.indexOf('?') >= 0 ? '&' : '?') + qs
  }
  return url
}

function redirectToLogin() {
  clearToken()
  uni.reLaunch({ url: '/pages/login/login' })
}

function parseBody(res) {
  let data = res && res.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (e) {
      data = null
    }
  }
  return data && typeof data === 'object' ? data : null
}

export function request(path, options) {
  const opts = options || {}
  const method = opts.method || 'GET'
  const auth = opts.auth !== false
  const skipAuthRedirect = opts.skipAuthRedirect === true
  const data = opts.data || null

  return new Promise((resolve, reject) => {
    const token = getToken()
    const header = { Accept: 'application/json' }
    if (auth && token) {
      header.Authorization = 'Bearer ' + token
      header['X-Auth-Token'] = token
    }

    uni.request({
      url: method === 'GET' ? buildUrl(path, data) : getBaseUrl() + path,
      method: method,
      data: method === 'GET' ? undefined : data || {},
      header: header,
      timeout: opts.timeout || 25000,
      success: (res) => {
        const body = parseBody(res)
        if (res.statusCode === 401) {
          if (!skipAuthRedirect) {
            redirectToLogin()
          }
          reject(new Error((body && body.error) || '登录状态已过期，请重新登录。'))
          return
        }
        if (body && body.ok === true) {
          resolve(body)
          return
        }
        const message = (body && body.error) || (body
          ? '请求失败（HTTP ' + res.statusCode + '）'
          : '服务器返回数据异常（HTTP ' + res.statusCode + '），请稍后重试')
        const error = new Error(message)
        error.statusCode = res.statusCode
        error.errors = (body && body.errors) || null
        reject(error)
      },
      fail: (err) => {
        const detail = err && err.errMsg ? '（' + err.errMsg + '）' : ''
        reject(new Error('无法连接服务器，请稍后重试' + detail))
      },
    })
  })
}

export function get(path, data, options) {
  return request(path, Object.assign({ method: 'GET', data: data }, options || {}))
}

export function post(path, data, options) {
  return request(path, Object.assign({ method: 'POST', data: data }, options || {}))
}

/**
 * 上传文件并直接生成消息。
 * @param {Object} params filePath / name / conversationId / sendAs / replyToMessageId / onProgress
 */
export function uploadFile(params) {
  const token = getToken()
  const onProgress = typeof params.onProgress === 'function' ? params.onProgress : null

  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: getBaseUrl() + '/api/upload.php',
      filePath: params.filePath,
      name: 'file',
      header: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
        'X-Auth-Token': token,
      },
      formData: {
        conversation_id: String(params.conversationId || 0),
        send_as: params.sendAs || 'auto',
        original_name: params.name || '',
        reply_to_message_id: params.replyToMessageId ? String(params.replyToMessageId) : '',
      },
      success: (res) => {
        const body = parseBody(res)
        if (res.statusCode === 401) {
          redirectToLogin()
          reject(new Error('登录状态已过期，请重新登录。'))
          return
        }
        if (body && body.ok === true) {
          resolve(body)
          return
        }
        reject(new Error((body && body.error) || '上传失败（HTTP ' + res.statusCode + '）'))
      },
      fail: () => {
        reject(new Error('上传失败，请检查网络连接。'))
      },
    })

    if (task && typeof task.onProgressUpdate === 'function' && onProgress) {
      task.onProgressUpdate((event) => {
        onProgress(Math.max(0, Math.min(100, Number(event.progress) || 0)))
      })
    }
  })
}

/** 会话中的图片/文件地址（App 需要带上 token 才能访问） */
export function fileUrl(upload) {
  if (!upload || !upload.id) {
    return ''
  }
  const token = getToken()
  return getBaseUrl() + '/file.php?id=' + encodeURIComponent(upload.id) + '&token=' + encodeURIComponent(token)
}

/** 把后端返回的相对地址转成绝对地址 */
export function absoluteUrl(path) {
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return getBaseUrl() + '/' + String(path).replace(/^\/+/, '')
}

export function messageMediaUrl(message) {
  if (!message || !message.upload) {
    return ''
  }
  return fileUrl(message.upload)
}
