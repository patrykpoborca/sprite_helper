import { applyChromaKey } from './chromaKey.js'

// Convert place-mode state -> swapCrop {x, y, w, h} via inverse math
export function placeToSwapCrop(offsetX, offsetY, scaleX, scaleY, cellW, cellH) {
  if (scaleX === 0 || scaleY === 0) return null
  return {
    x: Math.round(-offsetX / scaleX),
    y: Math.round(-offsetY / scaleY),
    w: Math.round(cellW / scaleX),
    h: Math.round(cellH / scaleY),
  }
}

export function drawCheckerboard(ctx, w, h, size = 8) {
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const isLight = ((x / size) + (y / size)) % 2 === 0
      ctx.fillStyle = isLight ? '#3a3a4a' : '#2a2a3a'
      ctx.fillRect(x, y, size, size)
    }
  }
}

export function buildProcessedCanvas(swapImage, swapCrop, chromaKey) {
  if (!swapImage || !chromaKey) return null

  let sw, sh
  if (swapCrop) {
    sw = swapCrop.w
    sh = swapCrop.h
  } else {
    sw = swapImage.naturalWidth || swapImage.width
    sh = swapImage.naturalHeight || swapImage.height
  }

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sw
  tempCanvas.height = sh
  const ctx = tempCanvas.getContext('2d')

  if (swapCrop) {
    ctx.drawImage(swapImage, swapCrop.x, swapCrop.y, swapCrop.w, swapCrop.h, 0, 0, sw, sh)
  } else {
    ctx.drawImage(swapImage, 0, 0)
  }

  return applyChromaKey(tempCanvas, chromaKey.color, chromaKey.tolerance)
}
