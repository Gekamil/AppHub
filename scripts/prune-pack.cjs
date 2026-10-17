const fs = require('fs')
const path = require('path')

module.exports = async function (context) {
  const appOutDir = context.appOutDir
  const filesToRemove = [
    'LICENSES.chromium.html',
    'dxcompiler.dll',
    'dxil.dll',
  ]
  for (const file of filesToRemove) {
    const p = path.join(appOutDir, file)
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p)
        console.log(`[prune-pack] Pruned ${file} from win-unpacked`)
      } catch (e) {
        console.warn(`[prune-pack] Could not prune ${file}:`, e.message)
      }
    }
  }
}
