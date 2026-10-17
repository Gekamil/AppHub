const esbuild = require('esbuild')
const path = require('path')

async function run() {
  const entry = path.join(__dirname, '../electron/main.src.cjs')
  const outfile = path.join(__dirname, '../electron/main.cjs')
  console.log('[bundle-electron] Bundling', entry, '->', outfile)
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    minify: false,
    sourcemap: false,
  })
  console.log('[bundle-electron] Electron main process bundled successfully.')
}

run().catch((err) => {
  console.error('[bundle-electron] Build error:', err)
  process.exit(1)
})
