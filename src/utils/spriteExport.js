import { computeAlignmentOffsets, computeExportPadding } from './alignment.js'
import { getFrameCanvas } from './frameExtract.js'

/**
 * Export an aligned sprite sheet as a PNG.
 *
 * @param {object[]} frames - Array of frame objects
 * @param {string|null} referenceFrameId
 * @param {object} gridConfig - { rows, cols, cellWidth, cellHeight }
 * @param {HTMLImageElement|HTMLCanvasElement} sheetSource - Original or processed sheet
 * @returns {HTMLCanvasElement} The exported sheet canvas
 */
export function exportAlignedSheet(frames, referenceFrameId, gridConfig, sheetSource) {
  const { rows, cols, cellWidth, cellHeight } = gridConfig
  const { offsets } = computeAlignmentOffsets(frames, referenceFrameId)
  const { padLeft, padTop, outputCellW, outputCellH } = computeExportPadding(offsets, cellWidth, cellHeight)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outputCellW * cols
  outCanvas.height = outputCellH * rows
  const ctx = outCanvas.getContext('2d')

  for (const frame of frames) {
    const frameCanvas = getFrameCanvas(frame, sheetSource)
    const offset = offsets.get(frame.id) || { dx: 0, dy: 0 }

    const destX = frame.col * outputCellW + padLeft + offset.dx
    const destY = frame.row * outputCellH + padTop + offset.dy

    ctx.drawImage(frameCanvas, Math.round(destX), Math.round(destY))
  }

  return outCanvas
}

/**
 * Download a canvas as a PNG file.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
export function downloadCanvas(canvas, filename) {
  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
