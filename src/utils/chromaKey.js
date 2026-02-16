/**
 * Apply chroma key (color-to-alpha) processing on a canvas.
 * Pixels matching the target color become transparent.
 *
 * @param {HTMLCanvasElement} sourceCanvas - Canvas with the swap image drawn on it
 * @param {string} color - Hex color string (e.g. '#00ff00')
 * @param {number} tolerance - 0–100, how close a pixel must be to the target color
 * @returns {HTMLCanvasElement} New canvas with chroma key applied
 */
export function applyChromaKey(sourceCanvas, color, tolerance) {
  const width = sourceCanvas.width
  const height = sourceCanvas.height

  const outCanvas = document.createElement('canvas')
  outCanvas.width = width
  outCanvas.height = height
  const outCtx = outCanvas.getContext('2d')

  // Copy source onto output
  outCtx.drawImage(sourceCanvas, 0, 0)

  const imageData = outCtx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Parse target color
  const tr = parseInt(color.slice(1, 3), 16)
  const tg = parseInt(color.slice(3, 5), 16)
  const tb = parseInt(color.slice(5, 7), 16)

  // Tolerance in RGB distance space (max distance is ~441 for opposite corners)
  const hardThreshold = (tolerance / 100) * 441
  const softThreshold = hardThreshold * 1.5

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const dist = Math.sqrt(
      (r - tr) ** 2 +
      (g - tg) ** 2 +
      (b - tb) ** 2
    )

    if (dist < hardThreshold) {
      data[i + 3] = 0 // fully transparent
    } else if (dist < softThreshold) {
      // Soft falloff for smooth edges
      const factor = (dist - hardThreshold) / (softThreshold - hardThreshold)
      data[i + 3] = Math.round(data[i + 3] * factor)
    }
    // else: leave unchanged
  }

  outCtx.putImageData(imageData, 0, 0)
  return outCanvas
}
