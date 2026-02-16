/**
 * Compute per-frame alignment offsets so all anchors align to a single target point.
 *
 * @param {object[]} frames - Array of frame objects with anchorX/anchorY
 * @param {string|null} referenceFrameId - ID of the reference frame, or null to use average
 * @returns {{ offsets: Map<string, {dx: number, dy: number}>, targetX: number, targetY: number }}
 */
export function computeAlignmentOffsets(frames, referenceFrameId) {
  if (!Array.isArray(frames) || frames.length === 0) {
    return { offsets: new Map(), targetX: 0, targetY: 0 }
  }
  const anchored = frames.filter(f => f.anchorX !== null && f.anchorY !== null)
  if (anchored.length === 0) {
    return { offsets: new Map(), targetX: 0, targetY: 0 }
  }

  let targetX, targetY

  if (referenceFrameId) {
    const ref = anchored.find(f => f.id === referenceFrameId)
    if (ref) {
      targetX = ref.anchorX
      targetY = ref.anchorY
    } else {
      // Reference frame has no anchor, fall back to average
      targetX = anchored.reduce((s, f) => s + f.anchorX, 0) / anchored.length
      targetY = anchored.reduce((s, f) => s + f.anchorY, 0) / anchored.length
    }
  } else {
    targetX = anchored.reduce((s, f) => s + f.anchorX, 0) / anchored.length
    targetY = anchored.reduce((s, f) => s + f.anchorY, 0) / anchored.length
  }

  const offsets = new Map()
  for (const frame of frames) {
    if (frame.anchorX !== null && frame.anchorY !== null) {
      offsets.set(frame.id, {
        dx: targetX - frame.anchorX,
        dy: targetY - frame.anchorY,
      })
    } else {
      offsets.set(frame.id, { dx: 0, dy: 0 })
    }
  }

  return { offsets, targetX, targetY }
}

/**
 * Compute export padding so no content clips when frames are shifted.
 *
 * @param {Map<string, {dx: number, dy: number}>} offsets
 * @param {number} cellWidth
 * @param {number} cellHeight
 * @returns {{ padLeft: number, padRight: number, padTop: number, padBottom: number, outputCellW: number, outputCellH: number }}
 */
export function computeExportPadding(offsets, cellWidth, cellHeight) {
  let minDx = 0, maxDx = 0, minDy = 0, maxDy = 0

  for (const { dx, dy } of offsets.values()) {
    minDx = Math.min(minDx, dx)
    maxDx = Math.max(maxDx, dx)
    minDy = Math.min(minDy, dy)
    maxDy = Math.max(maxDy, dy)
  }

  // Padding needed: if a frame shifts left (negative dx), we need pad on the left
  // If a frame shifts right (positive dx), we need pad on the right
  const padLeft = Math.ceil(Math.abs(minDx))
  const padRight = Math.ceil(maxDx)
  const padTop = Math.ceil(Math.abs(minDy))
  const padBottom = Math.ceil(maxDy)

  return {
    padLeft,
    padRight,
    padTop,
    padBottom,
    outputCellW: cellWidth + padLeft + padRight,
    outputCellH: cellHeight + padTop + padBottom,
  }
}
