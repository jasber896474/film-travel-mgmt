import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const require = createRequire(import.meta.url)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
}

function loadDotEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(join(process.cwd(), file), 'utf8')
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq < 1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
      }
    } catch { /* optional */ }
  }
}

function serveScouting() {
  return {
    name: 'serve-scouting',
    configureServer(server) {
      loadDotEnv()
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url === '/api/scouting') {
          const handlerPath = require.resolve('./api/scouting.js')
          const libPath = require.resolve('./lib/scouting.js')
          const pcloudPath = require.resolve('./lib/scouting-pcloud.js')
          delete require.cache[handlerPath]
          delete require.cache[libPath]
          delete require.cache[pcloudPath]
          const handler = require('./api/scouting.js')
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const raw = Buffer.concat(chunks).toString('utf8')
          try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
          await handler(req, res)
          return
        }

        let path = url
        if (path === '/scouting' || path === '/scouting/' || path.startsWith('/scouting/p/')) {
          path = '/scouting/index.html'
        } else if (path === '/scouting/new' || path === '/scouting/new/') {
          path = '/scouting/new.html'
        }
        if (!path.startsWith('/scouting/')) return next()

        const file = join(process.cwd(), path)
        if (!existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      if (!existsSync('scouting')) return
      mkdirSync('dist', { recursive: true })
      cpSync('scouting', 'dist/scouting', { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveScouting()],
})
