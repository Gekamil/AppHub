import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function downloadMiddlewarePlugin() {
  const GITHUB_RELEASE_APK_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'
  const GITHUB_RELEASE_SETUP_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe'

  const handler = (req, res, next) => {
    const rawUrl = req.url || ''
    if (rawUrl.startsWith('/download/')) {
      const fileName = path.basename(rawUrl.split('?')[0]).toLowerCase()
      if (fileName === 'apphub.apk' || fileName === 'studenthub.apk') {
        res.writeHead(302, {
          Location: GITHUB_RELEASE_APK_URL,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        })
        res.end()
        return
      }
      if (fileName === 'apphub-setup.exe' || fileName === 'studenthub-setup.exe' || fileName === 'studenthub.exe') {
        res.writeHead(302, {
          Location: GITHUB_RELEASE_SETUP_URL,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        })
        res.end()
        return
      }

      const originalFileName = path.basename(rawUrl.split('?')[0])
      const publicPath = path.resolve(process.cwd(), 'public/download', originalFileName)
      const distPath = path.resolve(process.cwd(), 'dist/download', originalFileName)
      const targetPath = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(distPath) ? distPath : null)

      if (targetPath) {
        const stat = fs.statSync(targetPath)
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="${originalFileName}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        })
        const stream = fs.createReadStream(targetPath)
        stream.pipe(res)
        return
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`File ${originalFileName} not found on server`)
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

function newsRssPlugin() {
  let cachedNews = null
  let lastFetch = 0
  const CACHE_TTL = 10 * 60 * 1000 // 10 minutes de cache

  const cleanText = (str = '') => {
    if (!str) return ''
    return str
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&#0*(\d+);/g, (_, dec) => {
        try {
          const code = parseInt(dec, 10)
          return code > 0 && code < 65536 ? String.fromCharCode(code) : _
        } catch (e) {
          return _
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          const code = parseInt(hex, 16)
          return code > 0 && code < 65536 ? String.fromCharCode(code) : _
        } catch (e) {
          return _
        }
      })
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&iexcl;/g, '¡')
      .replace(/&iquest;/g, '¿')
      .replace(/&aacute;/g, 'á')
      .replace(/&eacute;/g, 'é')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú')
      .replace(/&ntilde;/g, 'ñ')
      .replace(/&Aacute;/g, 'Á')
      .replace(/&Eacute;/g, 'É')
      .replace(/&Iacute;/g, 'Í')
      .replace(/&Oacute;/g, 'Ó')
      .replace(/&Uacute;/g, 'Ú')
      .replace(/&Ntilde;/g, 'Ñ')
      .replace(/&hellip;/g, '...')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&laquo;/g, '«')
      .replace(/&raquo;/g, '»')
      .replace(/&bull;/g, '•')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
  }

  const handler = async (req, res, next) => {
    const rawUrl = req.url || ''
    if (rawUrl.startsWith('/api/news') || rawUrl.startsWith('/api/proxy-rss')) {
      const now = Date.now()
      if (cachedNews && Array.isArray(cachedNews) && cachedNews.length >= 10 && (now - lastFetch) < CACHE_TTL) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(JSON.stringify(cachedNews))
        return
      }

      try {
        const feeds = [
          {
            source: 'El País',
            category: 'Actualidad',
            categoryKey: 'actualidad',
            icon: 'public',
            url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada',
          },
          {
            source: 'RTVE',
            category: 'España',
            categoryKey: 'actualidad',
            icon: 'public',
            url: 'https://www.rtve.es/api/noticias.rss',
          },
          {
            source: 'El Mundo',
            category: 'Actualidad',
            categoryKey: 'actualidad',
            icon: 'public',
            url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml',
          },
          {
            source: 'Marca',
            category: 'Deportes',
            categoryKey: 'sports',
            icon: 'sports_soccer',
            url: 'https://e00-marca.uecdn.es/rss/portada.xml',
          },
          {
            source: '20 Minutos',
            category: 'Sociedad',
            categoryKey: 'society',
            icon: 'people',
            url: 'https://www.20minutos.es/rss/',
          },
          {
            source: 'Xataka',
            category: 'Tecnología',
            categoryKey: 'tech',
            icon: 'devices',
            url: 'https://feeds.weblogssl.com/xataka2',
          },
        ]

        const collected = []
        await Promise.allSettled(
          feeds.map(async (f) => {
            try {
              const controller = new AbortController()
              const timer = setTimeout(() => controller.abort(), 3500)
              const resp = await fetch(f.url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudentHub/1.0)' },
              })
              clearTimeout(timer)
              if (!resp.ok) return
              const xml = await resp.text()
              const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || []
              let count = 0
              for (const itemXml of items) {
                if (count >= 3) break
                const titleM = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
                const linkM = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
                const descM = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
                const imgM = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
                  itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
                  itemXml.match(/<img[^>]+src=["']([^"']+)["']/i)

                const title = cleanText(titleM ? titleM[1] : '')
                const summary = cleanText(descM ? descM[1] : '').slice(0, 240)
                const url = (linkM ? linkM[1] : '').trim()

                if (title && url && title.length > 10) {
                  let catKey = f.categoryKey
                  let catName = f.category
                  let icon = f.icon

                  if (f.source === 'Xataka') {
                    if (/\b(inteligencia artificial|chatgpt|openai|gemini|llm|deep learning|ia generativa)\b/i.test(title)) {
                      catKey = 'ai'
                      catName = 'Inteligencia Artificial'
                      icon = 'smart_toy'
                    }
                  } else if (f.source !== 'Marca') {
                    if (/\b(bce|inflaci[oó]n|hipotecas?|tipos de inter[eé]s|salarios?|ibex|bolsa|fondos europeos|econom[ií]a)\b/i.test(title)) {
                      catKey = 'economy'
                      catName = 'Economía'
                      icon = 'trending_up'
                    } else if (/\b(cine|festival de cine|conciertos?|teatro|premios? goya|museos?|literatura|novela|cultura)\b/i.test(title)) {
                      catKey = 'culture'
                      catName = 'Cultura'
                      icon = 'theater_comedy'
                    } else if (/\b(sanidad|m[eé]dicos|vacunas?|hospital|alzheimer|c[aá]ncer|enfermedad|dieta mediterr[aá]nea|salud)\b/i.test(title)) {
                      catKey = 'health'
                      catName = 'Salud'
                      icon = 'favorite'
                    } else if (/\b(universidad|erasmus|estudiantes universitarios|selectividad|evau|campus universitario|becas?)\b/i.test(title)) {
                      catKey = 'university'
                      catName = 'Universidad'
                      icon = 'school'
                    }
                  }

                  collected.push({
                    id: `live-es-${catKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    title,
                    summary: summary || title,
                    category: catName,
                    categoryKey: catKey,
                    icon,
                    source: f.source,
                    sourceName: f.source,
                    url,
                    sourceUrl: url,
                    imageUrl: imgM ? imgM[1] : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
                    publishedAt: 'Hoy',
                    readTime: '3 min',
                    readingTime: '3 min',
                  })
                  count++
                }
              }
            } catch (err) {}
          })
        )

        if (collected.length >= 6) {
          cachedNews = collected.slice(0, 12)
          lastFetch = Date.now()
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(cachedNews))
          return
        }
      } catch (err) {}

      try {
        const { generateDailyNews } = await import('./src/services/newsService.js')
        const fallback = generateDailyNews()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(JSON.stringify(fallback))
        return
      } catch (e) {
        next()
      }
    }
    next()
  }

  return {
    name: 'news-rss-plugin',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), downloadMiddlewarePlugin(), icsProxyPlugin(), whatsappWebhookPlugin(), baileysBridgePlugin(), newsRssPlugin()],
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
