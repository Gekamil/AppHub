import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function downloadMiddlewarePlugin() {
  const handler = (req, res, next) => {
    const rawUrl = req.url || ''
    if (rawUrl.startsWith('/download/')) {
      const fileName = path.basename(rawUrl.split('?')[0])
      const publicPath = path.resolve(process.cwd(), 'public/download', fileName)
      const distPath = path.resolve(process.cwd(), 'dist/download', fileName)
      const targetPath = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(distPath) ? distPath : null)

      if (targetPath) {
        const stat = fs.statSync(targetPath)
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        })
        const stream = fs.createReadStream(targetPath)
        stream.pipe(res)
        return
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`File ${fileName} not found on server`)
        return
      }
    }
    next()
  }

  return {
    name: 'download-middleware-plugin',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

function icsProxyPlugin() {
  const handler = async (req, res) => {
    try {
      let targetUrl = parsedUrl.searchParams.get('url')
      if (!targetUrl) {
        res.statusCode = 400
        res.end('Missing url parameter')
        return
      }
      if (targetUrl.startsWith('webcal://')) {
        targetUrl = targetUrl.replace('webcal://', 'https://')
      }
      const teamupMatch = targetUrl.match(/(?:ics\.)?teamup\.com\/(?:feed\/|c\/)?([a-zA-Z0-9_-]+)/i)
      if (teamupMatch && !targetUrl.endsWith('.ics') && !targetUrl.includes('/0.ics')) {
        const teamupKey = teamupMatch[1]
        targetUrl = `https://ics.teamup.com/feed/${teamupKey}/0.ics`
      }
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*'
        }
      })
      if (!response.ok) {
        res.statusCode = response.status
        res.end(`Target returned ${response.status}`)
        return
      }
      const text = await response.text()
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.end(text)
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(err.message)
    }
  }

  return {
    name: 'ics-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy-ics', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy-ics', handler)
    }
  }
}

function whatsappWebhookPlugin() {
  const handler = async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost')
      if (req.method === 'GET') {
        const mode = parsedUrl.searchParams.get('hub.mode')
        const token = parsedUrl.searchParams.get('hub.verify_token')
        const challenge = parsedUrl.searchParams.get('hub.challenge')

        if (mode === 'subscribe' && (token === 'studenthub' || token === 'STUDENTHUB_WHATSAPP_TOKEN' || token === '12345')) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/plain')
          res.end(challenge)
          return
        }
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'ok' }))
        })
        return
      }

      res.statusCode = 405
      res.end('Method Not Allowed')
    } catch (err) {
      res.statusCode = 500
      res.end(err.message)
    }
  }

  return {
    name: 'whatsapp-webhook-plugin',
    configureServer(server) {
      server.middlewares.use('/api/whatsapp-webhook', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/whatsapp-webhook', handler)
    },
  }
}

function baileysBridgePlugin() {
  const proxyHandler = async (req, res, next) => {
    if (req.url && req.url.startsWith('/api/baileys')) {
      try {
        const targetUrl = `http://localhost:5005${req.url}`
        const headers = { ...req.headers, host: 'localhost:5005' }
        delete headers['content-length']

        let body = undefined
        if (req.method === 'POST' || req.method === 'PUT') {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          body = Buffer.concat(chunks)
        }

        const proxyRes = await fetch(targetUrl, {
          method: req.method,
          headers,
          body,
        })

        res.statusCode = proxyRes.status
        proxyRes.headers.forEach((v, k) => {
          if (k.toLowerCase() !== 'content-encoding') {
            res.setHeader(k, v)
          }
        })
        const buf = await proxyRes.arrayBuffer()
        res.end(Buffer.from(buf))
        return
      } catch (err) {
        const { handleBaileysApiRoute } = await import('./server/whatsapp-bridge.js')
        if (handleBaileysApiRoute(req, res)) return
      }
    }
    next()
  }

  return {
    name: 'baileys-bridge-plugin',
    configureServer(server) {
      server.middlewares.use(proxyHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(proxyHandler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), downloadMiddlewarePlugin(), icsProxyPlugin(), whatsappWebhookPlugin(), baileysBridgePlugin()],
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/release/**', '**/dist-electron/**', '**/android/**', '**/ios/**'],
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/release/**', '**/dist-electron/**', '**/android/**', '**/ios/**'],
    },
  }
})
