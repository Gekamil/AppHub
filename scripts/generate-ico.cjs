const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function createIcoFromPng(sourcePngPath, destIcoPath) {
  const sizes = [256, 128, 64, 48, 32, 16]
  const pngBuffers = []

  for (const size of sizes) {
    const buf = await sharp(sourcePngPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    pngBuffers.push({ size, buffer: buf })
  }

  // Header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4) // Count of images

  // Directory entries: 16 bytes each
  const dirSize = pngBuffers.length * 16
  let offset = 6 + dirSize

  const dirBuffers = []
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16)
    const s = item.size >= 256 ? 0 : item.size
    entry.writeUInt8(s, 0) // Width
    entry.writeUInt8(s, 1) // Height
    entry.writeUInt8(0, 2) // Color count
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Planes
    entry.writeUInt16LE(32, 6) // Bit count
    entry.writeUInt32LE(item.buffer.length, 8) // Bytes in resource
    entry.writeUInt32LE(offset, 12) // Image offset
    dirBuffers.push(entry)
    offset += item.buffer.length
  }

  const finalIcoBuffer = Buffer.concat([
    header,
    ...dirBuffers,
    ...pngBuffers.map((item) => item.buffer),
  ])

  fs.mkdirSync(path.dirname(destIcoPath), { recursive: true })
  fs.writeFileSync(destIcoPath, finalIcoBuffer)
  console.log(`Generated ICO at ${destIcoPath} (${finalIcoBuffer.length} bytes)`)
}

async function main() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  const buildIco = path.join(process.cwd(), 'build', 'icon.ico')
  const electronIco = path.join(process.cwd(), 'electron', 'icon.ico')
  const publicIco = path.join(process.cwd(), 'public', 'favicon.ico')

  await createIcoFromPng(logoPath, buildIco)
  await createIcoFromPng(logoPath, electronIco)
  await createIcoFromPng(logoPath, publicIco)
}

main().catch(console.error)
