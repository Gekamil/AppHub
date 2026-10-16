const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const tempDir = path.join(process.cwd(), 'temp_ipa')
const payloadDir = path.join(tempDir, 'Payload')
const appDir = path.join(payloadDir, 'AppHub.app')

if (fs.existsSync(tempDir)) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch (e) {}
}
fs.mkdirSync(appDir, { recursive: true })

const iosAppDir = path.join(process.cwd(), 'ios', 'App', 'App')
if (fs.existsSync(iosAppDir)) {
  fs.cpSync(iosAppDir, appDir, {
    recursive: true,
    filter: (src) => !src.includes('public') && !src.includes('download')
  })
}

const distDir = path.join(process.cwd(), 'dist')
const wwwDir = path.join(appDir, 'public')
if (fs.existsSync(distDir)) {
  fs.cpSync(distDir, wwwDir, {
    recursive: true,
    filter: (src) => !src.includes('download')
  })
}

const tempZip = path.join(process.cwd(), 'temp_ipa', 'AppHub.zip')
const ipaDest = path.join(process.cwd(), 'public', 'download', 'AppHub.ipa')
const distIpaDest = path.join(process.cwd(), 'dist', 'download', 'AppHub.ipa')

console.log('Compressing Payload into AppHub.zip...')
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${payloadDir}' -DestinationPath '${tempZip}' -Force"`)

fs.copyFileSync(tempZip, ipaDest)

if (fs.existsSync(path.join(process.cwd(), 'dist', 'download'))) {
  fs.copyFileSync(ipaDest, distIpaDest)
}

try {
  fs.rmSync(tempDir, { recursive: true, force: true })
} catch (e) {}

console.log('Success! Created AppHub.ipa:', fs.statSync(ipaDest).size, 'bytes')
