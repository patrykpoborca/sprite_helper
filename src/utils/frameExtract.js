/**
 * Extract a single frame from the sprite sheet as a canvas.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source - The sprite sheet image or processed canvas
 * @param {object} frame - Frame object with srcX, srcY, srcW, srcH
 * @returns {HTMLCanvasElement}
 */
export function extractFrameCanvas(source, frame) {
  const canvas = document.createElement('canvas')
  canvas.width = frame.srcW
  canvas.height = frame.srcH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, frame.srcX, frame.srcY, frame.srcW, frame.srcH, 0, 0, frame.srcW, frame.srcH)
  return canvas
}

/**
 * Generate a thumbnail data URL for a frame.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {object} frame
 * @param {number} maxSize - Max thumbnail dimension
 * @returns {string} data URL
 */
export function generateThumbnail(source, frame, maxSize = 48) {
  const canvas = getFrameCanvas(frame, source)
  const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1)
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = Math.round(canvas.width * scale)
  thumbCanvas.height = Math.round(canvas.height * scale)
  const ctx = thumbCanvas.getContext('2d')
  ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height)
  return thumbCanvas.toDataURL('image/png')
}

/**
 * Get the effective source for a frame (swap image with crop, or original sheet).
 *
 * @param {object} frame
 * @param {HTMLImageElement|HTMLCanvasElement} sheetSource
 * @returns {HTMLCanvasElement}
 */
export function getFrameCanvas(frame, sheetSource) {
  if (frame.processedCanvas) {
    return frame.processedCanvas
  }
  if (frame.swapImage) {
    const canvas = document.createElement('canvas')
    canvas.width = frame.srcW
    canvas.height = frame.srcH
    const ctx = canvas.getContext('2d')
    if (frame.swapCrop) {
      ctx.drawImage(frame.swapImage, frame.swapCrop.x, frame.swapCrop.y, frame.swapCrop.w, frame.swapCrop.h, 0, 0, frame.srcW, frame.srcH)
    } else {
      ctx.drawImage(frame.swapImage, 0, 0, frame.srcW, frame.srcH)
    }
    return canvas
  }
  return extractFrameCanvas(sheetSource, frame)
}
