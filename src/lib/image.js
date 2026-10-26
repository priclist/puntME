/**
 * A picked photo → a JPEG/WebP blob no bigger than `max` px on its long
 * side, for a business's photos. Phone photos shrink from ~4 MB to ~300 KB.
 */
export async function photoFromFile(file, max = 1600) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`“${file.name}” couldn’t be opened. Try another photo.`)
  })
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blobOf = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.82))
  // Older Safari can't encode WebP and quietly returns PNG; use JPEG there.
  const webp = await blobOf('image/webp')
  return webp?.type === 'image/webp' ? webp : blobOf('image/jpeg')
}

/**
 * A picked photo → a small square data URL for a business logo (centre
 * cropped, ~256px), so uploads stay tiny on mobile data.
 */
export async function logoFromFile(file, size = 256) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo or picture file.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That picture couldn’t be opened. Try another one.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // transparent PNG logos get a white background
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close?.()
  // Older Safari can't encode WebP and quietly returns PNG; use JPEG there.
  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}
