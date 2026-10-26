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
