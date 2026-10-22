import fs from 'node:fs'
import path from 'node:path'

/**
 * Safely read a UTF-8 text file.
 * Returns file contents as string or throws assertion error if missing.
 */
export function readUtf8(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file does not exist: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf8')
}

/**
 * Check if a file exists on disk.
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath)
}

/**
 * Remove comments from JavaScript or CSS source code for clean regex matching.
 */
export function stripComments(code) {
  if (!code) return ''
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
    .replace(/\/\/.*$/gm, '')           // Line comments
}

/**
 * In-memory Mock Storage implementing the Web Storage API (localStorage/sessionStorage).
 */
export class MockStorage {
  constructor(initialData = {}) {
    this._store = new Map(Object.entries(initialData))
  }

  getItem(key) {
    return this._store.has(String(key)) ? this._store.get(String(key)) : null
  }

  setItem(key, value) {
    this._store.set(String(key), String(value))
  }

  removeItem(key) {
    this._store.delete(String(key))
  }

  clear() {
    this._store.clear()
  }

  get length() {
    return this._store.size
  }

  key(index) {
    const keys = Array.from(this._store.keys())
    return keys[index] ?? null
  }

  toJSON() {
    return Object.fromEntries(this._store)
  }
}

/**
 * Fetch HTTP headers for a remote asset following redirects.
 */
export async function probeRemoteAsset(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'StudentHub-E2E-Verifier/1.0',
        ...options.headers,
      },
      signal: AbortSignal.timeout(options.timeoutMs || 10000),
    })

    return {
      ok: response.ok,
      status: response.status,
      contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      contentType: response.headers.get('content-type') || '',
      contentDisposition: response.headers.get('content-disposition') || '',
      finalUrl: response.url,
      headers: response.headers,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentLength: 0,
      error: err.message,
    }
  }
}
