const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

async function createIcoFromPngBuffer(pngBuffer, destIcoPath) {
  const sizes = [256, 128, 64, 48, 32, 16]
  const pngBuffers = []

  for (const size of sizes) {
    const buf = await sharp(pngBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    pngBuffers.push({ size, buffer: buf })
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngBuffers.length, 4)

  const dirSize = pngBuffers.length * 16
  let offset = 6 + dirSize

  const dirBuffers = []
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16)
    const s = item.size >= 256 ? 0 : item.size
    entry.writeUInt8(s, 0)
    entry.writeUInt8(s, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(item.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
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
  console.log(`[makeRoundedLogo] Generated ICO: ${destIcoPath} (${finalIcoBuffer.length} bytes)`)
}

async function main() {
  const logoPath = path.join(__dirname, '../public/logo.png')
  const original = await sharp(logoPath).png().toBuffer()

  // Bounding box of original symbol is roughly left: 240, top: 180, width: 544, height: 664
  const symbol = await sharp(original)
    .extract({ left: 240, top: 180, width: 544, height: 664 })
    .png()
    .toBuffer()

  // Resize symbol so it's a bit smaller (height: 500 instead of 664, ~75% of original size)
  const resizedSymbol = await sharp(symbol)
    .resize(null, 500, { fit: 'contain' })
    .png()
    .toBuffer()

  // Create an SVG rounded rectangle card with smooth rounded corners and a subtle soft border
  const r = 224
  const cardSvg = Buffer.from(
    '<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="16" y="16" width="992" height="992" rx="' + r + '" ry="' + r + '" fill="#ffffff" stroke="rgba(0,0,0,0.12)" stroke-width="12"/>' +
    '</svg>'
  )

  const maskSvg = Buffer.from(
    '<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="16" y="16" width="992" height="992" rx="' + r + '" ry="' + r + '" fill="#ffffff"/>' +
    '</svg>'
  )

  // Step 1: Render the white squircle card with its border and place the symbol in the center
  const cardWithSymbol = await sharp(cardSvg)
    .composite([
      {
        input: resizedSymbol,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer()

  // Step 2: Apply the mask so pixels outside the rounded corners are 100% transparent
  const finalRounded = await sharp(cardWithSymbol)
    .composite([
      {
        input: maskSvg,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer()

  // Write new rounded logo to public files
  const publicLogo = path.join(__dirname, '../public/logo.png')
  const publicAppIcon = path.join(__dirname, '../public/app-icon.png')
  const publicFavicon = path.join(__dirname, '../public/favicon.png')

  fs.writeFileSync(publicLogo, finalRounded)
  fs.writeFileSync(publicAppIcon, finalRounded)
  fs.writeFileSync(publicFavicon, finalRounded)
  console.log('[makeRoundedLogo] Updated public/logo.png, app-icon.png, favicon.png')

  // Generate ICO files
  const buildIco = path.join(__dirname, '../build/icon.ico')
  const electronIco = path.join(__dirname, '../electron/icon.ico')
  const publicIco = path.join(__dirname, '../public/favicon.ico')

  await createIcoFromPngBuffer(finalRounded, buildIco)
  await createIcoFromPngBuffer(finalRounded, electronIco)
  await createIcoFromPngBuffer(finalRounded, publicIco)

  // Remove test files if they exist
  const previewPath1 = path.join(__dirname, '../public/logo-test-preview.png')
  const previewPath2 = path.join(__dirname, '../public/logo-rounded-preview.png')
  if (fs.existsSync(previewPath1)) fs.unlinkSync(previewPath1)
  if (fs.existsSync(previewPath2)) fs.unlinkSync(previewPath2)

  console.log('[makeRoundedLogo] All logo and icon assets updated successfully.')
}

main().catch(console.error)
